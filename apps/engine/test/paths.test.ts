// The paths every real test runs through:
// live SSE, the error path, hostile mail content in the rendered result, rate limits, purge limits, SMTP limits.
import { createConnection } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { renderResultView, type MailResult } from '@emc/shared';
import { createApi } from '../src/api.ts';
import { RateLimiter } from '../src/ratelimit.ts';
import { createSmtpServer } from '../src/smtp.ts';
import { TestService } from '../src/service.ts';
import { Store } from '../src/store.ts';
import { fakeResolver, fixture, GOOD_IP } from './helpers.ts';

const ENV = { ip: GOOD_IP, helo: 'mail.gut.example.test', sender: 'max@gut.example.test', tls: { version: 'TLSv1.3' } };

function setup(opts: { ttlMinutes?: number; now?: () => Date } = {}) {
	const store = new Store(':memory:');
	const service = new TestService({
		store,
		testDomain: 'test.e-mail-check.de',
		testTtlMinutes: opts.ttlMinutes ?? 60,
		now: opts.now,
		deps: { resolver: fakeResolver(), mta: 'mx.test', resultTtlDays: 7, scanContent: async () => ({ score: 0, symbols: [] }), now: opts.now },
	});
	const app = createApi({ service, resolver: fakeResolver(), rateLimit: { tests: 3, dns: 2 }, trustProxy: true, clientIp: (c) => c.req.header('x-test-ip') ?? '1.1.1.1' });
	return { store, service, app };
}
const events = (text: string) => [...text.matchAll(/event: (\w+)\ndata: (.+)/g)].map((m) => ({ type: m[1], data: JSON.parse(m[2]) }));
const listeners = (service: TestService, id: string) => (service as unknown as { bus: { listenerCount: (id: string) => number } }).bus.listenerCount(id);

describe('live SSE', () => {
	it('subscribed while waiting: every step once, live, then done', async () => {
		const { app, service } = setup();
		const test = service.createTest();
		const res = app.request(`/api/tests/${test.id}/events`);
		await new Promise((r) => setTimeout(r, 30));
		expect(listeners(service, test.id)).toBe(1);
		await service.handleMessage(test.address, fixture('gut.eml'), ENV);
		const got = events(await (await res).text());
		expect(got.filter((e) => e.type === 'step').map((e) => e.data.step)).toEqual(['received', 'spf', 'dkim', 'dmarc', 'reputation', 'content']);
		expect(got.at(-1)?.type).toBe('done');
		expect(listeners(service, test.id)).toBe(0);
	});

	it('says "expired" right when the address runs out, not at the next ping', async () => {
		const { app, service } = setup({ ttlMinutes: 0.003 });
		const test = service.createTest();
		const t0 = Date.now();
		const got = events(await (await app.request(`/api/tests/${test.id}/events`)).text());
		expect(got.map((e) => e.type)).toEqual(['expired']);
		expect(Date.now() - t0).toBeLessThan(2000);
	});

	it('unsubscribes when the client goes away', async () => {
		const { app, service } = setup();
		const test = service.createTest();
		const ctrl = new AbortController();
		const res = await app.request(`/api/tests/${test.id}/events`, { signal: ctrl.signal });
		const reader = res.body!.getReader();
		await new Promise((r) => setTimeout(r, 30));
		expect(listeners(service, test.id)).toBe(1);
		ctrl.abort();
		await reader.cancel().catch(() => undefined);
		await new Promise((r) => setTimeout(r, 30));
		expect(listeners(service, test.id)).toBe(0);
	});

	it('allows at most 5 open streams per IP', async () => {
		const { app, service } = setup();
		const test = service.createTest();
		const open = await Promise.all([0, 1, 2, 3, 4].map(() => app.request(`/api/tests/${test.id}/events`)));
		expect(open.every((r) => r.status === 200)).toBe(true);
		expect((await app.request(`/api/tests/${test.id}/events`)).status).toBe(429);
		expect((await app.request(`/api/tests/${test.id}/events`, { headers: { 'x-test-ip': '9.9.9.9' } })).status).toBe(200);
		for (const r of open) await r.body?.cancel();
	});
});

describe('error path', () => {
	it('a failing analysis ends in "error": no result, event sent, counter unchanged', async () => {
		const { app, service, store } = setup();
		const hang = new TestService({ store, testDomain: 'test.e-mail-check.de', testTtlMinutes: 60, analysisTimeoutMs: 30, deps: { resolver: () => new Promise(() => undefined), mta: 'm', resultTtlDays: 7, scanContent: null } });
		const test = hang.createTest();
		const r = await hang.handleMessage(test.address, fixture('gut.eml'), ENV);
		expect(r).toBeUndefined();
		const status = (await (await app.request(`/api/tests/${test.id}`)).json()) as { state: string; resultId: string | null };
		expect(status).toMatchObject({ state: 'error', resultId: null });
		expect(events(await (await app.request(`/api/tests/${test.id}/events`)).text()).map((e) => e.type)).toContain('error');
		expect(store.mailsChecked()).toBe(0);
		void service;
	});
});

describe('hostile mail content in the rendered result', () => {
	const evil = Buffer.from(
		[
			'DKIM-Signature: v=1; a=rsa-sha256; d=<!--emc{env "HOME"}emc-->; s=<script>alert(1)</script>; h=from; bh=x; b=x',
			'From: "<img src=x onerror=alert(1)>" <max@gut.example.test>',
			'To: k@test.e-mail-check.de',
			'Subject: <script>alert(2)</script> <!--emc{readFile "/etc/passwd"}emc-->',
			'Received: from x by <!--emc{env "HOME"}emc--> with ESMTP; Tue, 20 Oct 2026 10:00:00 +0200',
			'Content-Type: text/html; charset=utf-8',
			'',
			'<p>Hallo <!--emc{readFile "/etc/passwd"}emc--></p><a href="https://evil.example/?a=<script>">x</a>',
			'',
		].join('\r\n'),
	);

	it('escapes everything and never leaves template delimiters in /view or /api/results', async () => {
		const { app, service } = setup();
		const test = service.createTest();
		const res = (await service.handleMessage(test.address, evil, ENV))!;
		// Server-rendered (Caddy runs it as a template): no delimiters, no markup from the mail.
		const view = await (await app.request(`/api/results/${res.id}/view`)).text();
		expect(view).not.toContain('<!--emc{');
		expect(view).not.toMatch(/<script|<img src=x/i);
		// Browser-rendered from the JSON: the same function, the same escaping.
		const json = (await (await app.request(`/api/results/${res.id}`)).json()) as MailResult;
		expect(renderResultView(json, { shareUrl: 'https://x' })).not.toMatch(/<script|<img src=x/i);
	});
});

describe('rate limit', () => {
	it('frees the window after an hour and tells how long to wait', () => {
		const rl = new RateLimiter(2, 3600_000);
		const t = 1_000_000;
		expect([rl.hit('a', t), rl.hit('a', t + 1000)]).toEqual([0, 0]);
		expect(rl.hit('a', t + 2000)).toBe(3598);
		expect(rl.hit('a', t + 3600_001)).toBe(0);
	});

	it('answers 429 with Retry-After', async () => {
		const { app } = setup();
		for (let i = 0; i < 3; i++) await app.request('/api/tests', { method: 'POST' });
		const res = await app.request('/api/tests', { method: 'POST' });
		expect(res.status).toBe(429);
		expect(Number(res.headers.get('retry-after'))).toBeGreaterThan(0);
	});

	it('counts per X-Forwarded-For client when the proxy is trusted', async () => {
		const store = new Store(':memory:');
		const service = new TestService({ store, testDomain: 't', testTtlMinutes: 60, deps: { resolver: fakeResolver(), mta: 'm', resultTtlDays: 7, scanContent: null } });
		const app = createApi({ service, resolver: fakeResolver(), rateLimit: { tests: 1, dns: 1 }, trustProxy: true });
		const post = (ip: string) => app.request('/api/tests', { method: 'POST', headers: { 'x-forwarded-for': `${ip}, 10.0.0.1` } });
		expect((await post('5.5.5.5')).status).toBe(201);
		expect((await post('5.5.5.5')).status).toBe(429);
		expect((await post('6.6.6.6')).status).toBe(201);
	});
});

describe('purge limits', () => {
	it('keeps a test address for 7 days and deletes it right after', () => {
		const store = new Store(':memory:');
		const created = new Date('2026-10-21T10:00:00Z');
		store.createTest({ id: 'a'.repeat(22), local: 'aaaaaaaa', createdAt: created.toISOString(), expiresAt: new Date(created.getTime() + 3600_000).toISOString() });
		expect(store.purge(new Date(created.getTime() + (7 * 24 - 1) * 3600_000))).toBe(0);
		expect(store.getTest('a'.repeat(22))).toBeDefined();
		expect(store.purge(new Date(created.getTime() + 7 * 86400_000 + 1000))).toBe(1);
		expect(store.getTest('a'.repeat(22))).toBeUndefined();
	});
});

describe('SMTP limits', () => {
	let port = 0;
	const { service } = setup();
	const server = createSmtpServer(service, { hostname: 'mx.test', maxMessageBytes: 1 << 20, allowXclient: false });
	beforeAll(() => new Promise<void>((r) => server.listen(0, () => ((port = (server.server.address() as { port: number }).port), r()))));
	afterAll(() => new Promise<void>((r) => server.close(() => r())));
	const talk = (commands: string[]) =>
		new Promise<number[]>((resolve, reject) => {
			const sock = createConnection(port, '127.0.0.1');
			const codes: number[] = [];
			let buf = '';
			let i = 0;
			sock.on('data', (d) => {
				buf += d.toString();
				while (/^\d{3} .*\r\n/m.test(buf)) {
					const m = /^(\d{3}) .*\r\n/m.exec(buf)!;
					codes.push(Number(m[1]));
					buf = buf.slice(m.index + m[0].length);
					if (i < commands.length) sock.write(commands[i++] + '\r\n');
					else sock.end();
				}
			});
			sock.on('close', () => resolve(codes));
			sock.on('error', reject);
		});

	it('takes at most 5 recipients, the 6th gets 452', async () => {
		const tests = [0, 1, 2, 3, 4, 5].map(() => service.createTest());
		const codes = await talk(['EHLO x', 'MAIL FROM:<a@b.de>', ...tests.map((t) => `RCPT TO:<${t.address}>`), 'QUIT']);
		expect(codes.slice(3, 8)).toEqual([250, 250, 250, 250, 250]);
		expect(codes[8]).toBe(452);
	});

	it('refuses a second mail to a used address', async () => {
		const test = service.createTest();
		await service.handleMessage(test.address, fixture('gut.eml'), ENV);
		const codes = await talk(['EHLO x', 'MAIL FROM:<a@b.de>', `RCPT TO:<${test.address}>`, 'QUIT']);
		expect(codes).toContain(550);
	});
});
