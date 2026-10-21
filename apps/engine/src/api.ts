// HTTP API. All routes live under /api; the static website is served by Caddy.
import { Hono, type Context } from 'hono';
import { streamSSE } from 'hono/streaming';
import { getConnInfo } from '@hono/node-server/conninfo';
import { renderResultMissing, renderResultView, type ProgressEvent } from '@emc/shared';
import { dnsCheck, normalizeDomain } from './dnscheck.ts';
import type { DnsResolver } from './dns.ts';
import { RateLimiter } from './ratelimit.ts';
import type { TestService } from './service.ts';

export interface ApiOptions {
	service: TestService;
	resolver: DnsResolver;
	rateLimit: { tests: number; dns: number };
	trustProxy: boolean;
	/** Public site URL for share links in the server-rendered result (no trailing slash). */
	siteUrl?: string;
	/** Override for tests (no socket there). */
	clientIp?: (c: Context) => string;
}

const ID = /^[\w-]{22}$/;

export function createApi(opts: ApiOptions): Hono {
	const app = new Hono().basePath('/api');
	const testLimit = new RateLimiter(opts.rateLimit.tests, 3600_000);
	const dnsLimit = new RateLimiter(opts.rateLimit.dns, 3600_000);
	const statsLimit = new RateLimiter(600, 3600_000);
	setInterval(() => {
		testLimit.sweep();
		dnsLimit.sweep();
		statsLimit.sweep();
	}, 600_000).unref();

	const ipOf =
		opts.clientIp ??
		((c: Context) => {
			const fwd = opts.trustProxy ? c.req.header('x-forwarded-for')?.split(',')[0]?.trim() : undefined;
			return fwd || getConnInfo(c).remote.address || 'unknown';
		});

	app.use('*', async (c, next) => {
		await next();
		c.header('Cache-Control', 'no-store');
		c.header('X-Robots-Tag', 'noindex, nofollow');
		c.header('X-Content-Type-Options', 'nosniff');
	});

	const tooMany = (c: Context, wait: number) => {
		c.header('Retry-After', String(wait));
		return c.json({ error: 'rate_limited', message: `Du hast gerade sehr viele Tests gemacht. Probier es in ${Math.ceil(wait / 60)} Minuten wieder.` }, 429);
	};

	app.get('/health', (c) => c.json({ ok: true }));

	// Public counter for the status bar: one number, no personal data, cached for 60 s.
	app.get('/stats', (c) => {
		const wait = statsLimit.hit(ipOf(c));
		if (wait) return tooMany(c, wait);
		return c.json({ mailsChecked: opts.service.mailsChecked() });
	});

	app.post('/tests', (c) => {
		const wait = testLimit.hit(ipOf(c));
		if (wait) return tooMany(c, wait);
		return c.json(opts.service.createTest(), 201);
	});

	app.get('/tests/:id', (c) => {
		const id = c.req.param('id');
		const status = ID.test(id) ? opts.service.status(id) : undefined;
		return status ? c.json(status) : c.json({ error: 'not_found' }, 404);
	});

	app.get('/tests/:id/events', (c) => {
		const id = c.req.param('id');
		const status = ID.test(id) ? opts.service.status(id) : undefined;
		if (!status) return c.json({ error: 'not_found' }, 404);
		return streamSSE(c, async (stream) => {
			const send = (e: ProgressEvent) => stream.writeSSE({ event: e.type, data: JSON.stringify(e) });
			const queue: ProgressEvent[] = [];
			let wake: (() => void) | null = null;
			const unsubscribe = opts.service.subscribe(id, (e) => {
				queue.push(e);
				wake?.();
			});
			stream.onAbort(() => {
				unsubscribe();
				wake?.();
			});
			// Replay what already happened, so late subscribers see the full progress.
			const now = opts.service.status(id)!;
			const replay = opts.service.stepEvents(id);
			for (const step of now.done) await send(replay.find((e) => e.step === step) ?? { type: 'step', step });
			if (now.state === 'done' && now.resultId) await send({ type: 'done', resultId: now.resultId });
			if (now.state === 'expired') await send({ type: 'expired' });
			if (now.state === 'error') await send({ type: 'error', message: 'Die Auswertung ist fehlgeschlagen.' });
			let finished = ['done', 'expired', 'error'].includes(now.state);
			const deadline = Date.now() + 30 * 60_000;
			while (!finished && !stream.aborted && Date.now() < deadline) {
				if (queue.length === 0) {
					// Heartbeat every 20 s keeps proxies from closing the connection.
					await new Promise<void>((resolve) => {
						wake = resolve;
						setTimeout(resolve, 20_000);
					});
					wake = null;
					if (queue.length === 0 && !stream.aborted) {
						await stream.write(': ping\n\n');
						if (opts.service.status(id)?.state === 'expired') {
							await send({ type: 'expired' });
							finished = true;
						}
					}
					continue;
				}
				const e = queue.shift()!;
				if (e.type === 'step' && now.done.includes(e.step)) continue;
				await send(e);
				if (e.type !== 'step') finished = true;
			}
			unsubscribe();
		});
	});

	app.get('/results/:id', (c) => {
		const id = c.req.param('id');
		const result = ID.test(id) ? opts.service.result(id) : undefined;
		return result ? c.json(result) : c.json({ error: 'not_found', message: 'Dieses Ergebnis gibt es nicht mehr. Ergebnisse werden nach 7 Tagen gelöscht.' }, 404);
	});

	// Server-rendered result for /ergebnis/<id>: Caddy includes this fragment into the static shell (templates),
	// so the result is visible without JavaScript. Always 200: the fragment itself says "not found".
	app.get('/results/:id/view', (c) => {
		const id = c.req.param('id');
		const result = ID.test(id) ? opts.service.result(id) : undefined;
		c.header('Content-Type', 'text/html; charset=utf-8');
		if (!result) return c.body(renderResultMissing());
		// The subject only exists in RAM for the tester's first hour; the server-rendered page never shows it.
		const shared = { ...result, mail: { ...result.mail, from: null, subject: null } };
		return c.body(renderResultView(shared, { shareUrl: `${opts.siteUrl ?? 'https://e-mail-check.de'}/ergebnis/${id}` }));
	});

	app.get('/dns', async (c) => {
		const domain = normalizeDomain(c.req.query('domain') ?? '');
		if (!domain) return c.json({ error: 'invalid_domain', message: 'Das sieht nicht nach einer Domain aus. Beispiel: deine-firma.de' }, 400);
		const selector = c.req.query('selector')?.trim().toLowerCase();
		if (selector && !/^[a-z0-9._-]{1,63}$/.test(selector)) return c.json({ error: 'invalid_selector', message: 'Der Selektor enthält ungültige Zeichen.' }, 400);
		const wait = dnsLimit.hit(ipOf(c));
		if (wait) return tooMany(c, wait);
		try {
			return c.json(await dnsCheck(domain, opts.resolver, selector || undefined));
		} catch (err) {
			console.error('dns check failed', (err as Error).message);
			return c.json({ error: 'dns_failed', message: 'Die DNS-Abfrage ist fehlgeschlagen. Probier es gleich noch einmal.' }, 502);
		}
	});

	app.notFound((c) => c.json({ error: 'not_found' }, 404));
	return app;
}
