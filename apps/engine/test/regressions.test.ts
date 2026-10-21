// Regression tests for limits and edge cases: linear HTML scanning, SMTP limits, timeouts, DNS outages.
import { createConnection } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { ProgressEvent } from '@emc/shared';
import { bodyStats, hasTextPart, htmlToReadable } from '../src/analyze.ts';
import { checkReputation } from '../src/checks/reputation.ts';
import { createSmtpServer } from '../src/smtp.ts';
import { TestService } from '../src/service.ts';
import { Store } from '../src/store.ts';
import { fakeResolver, fixture, GOOD_IP } from './helpers.ts';

describe('C1: HTML scanning runs in linear time', () => {
	it.each([
		['a million <', '<'.repeat(1_000_000)],
		['unclosed tags', '<a '.repeat(300_000)],
		['unclosed style', '<style>'.repeat(200_000)],
	])('%s in under 150 ms', (_, html) => {
		const t = performance.now();
		htmlToReadable(html);
		bodyStats({ html, text: '' } as never, Buffer.from('Content-Type: text/html\r\n\r\n'));
		expect(performance.now() - t).toBeLessThan(150);
	});

	it('still reads the visible text', () => {
		expect(htmlToReadable('<style>p{}</style><p>Hallo <b>Welt</b></p><SCRIPT>x()</SCRIPT>&nbsp;!').replace(/\s+/g, ' ').trim()).toBe('Hallo Welt !');
	});

	it('counts a text/plain attachment as no text version', () => {
		const att = 'Content-Type: multipart/mixed; boundary=b\r\n\r\n--b\r\nContent-Type: text/html\r\n\r\n<p>x</p>\r\n--b\r\nContent-Type: text/plain; name=a.txt\r\nContent-Disposition: attachment; filename=a.txt\r\n\r\nx\r\n--b--\r\n';
		expect(hasTextPart(Buffer.from(att))).toBe(false);
		expect(hasTextPart(Buffer.from('Content-Type: text/plain; charset=utf-8\r\n\r\nHallo'))).toBe(true);
	});
});

describe('SMTP limits', () => {
	let PORT = 0;
	const store = new Store(':memory:');
	const service = new TestService({ store, testDomain: 'test.e-mail-check.de', testTtlMinutes: 60, deps: { resolver: fakeResolver(), mta: 'mx.test', resultTtlDays: 7, scanContent: null } });
	const server = createSmtpServer(service, { hostname: 'mx.test', maxMessageBytes: 4096, allowXclient: false, maxPerIp: 3, maxBadRcpt: 4 });
	beforeAll(() => new Promise<void>((r) => server.listen(0, () => ((PORT = (server.server.address() as { port: number }).port), r()))));
	afterAll(() => new Promise<void>((r) => server.close(() => r())));

	/** Sends commands one reply at a time and returns the reply codes. */
	const talk = (commands: string[]) =>
		new Promise<number[]>((resolve, reject) => {
			const sock = createConnection(PORT, '127.0.0.1');
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

	it('C2: refuses a message over the limit with 552 and keeps no oversized buffer', async () => {
		const test = service.createTest();
		const big = 'Subject: x\r\n\r\n' + 'a'.repeat(200_000);
		const codes = await talk(['EHLO x', 'MAIL FROM:<a@b.de>', `RCPT TO:<${test.address}>`, 'DATA', big + '\r\n.', 'QUIT']);
		expect(codes).toContain(552);
		expect(service.status(test.id)?.state).toBe('waiting');
	});

	it('I1: a fourth connection from the same address is turned away', async () => {
		const open = await Promise.all([0, 1, 2].map(() => new Promise<ReturnType<typeof createConnection>>((r) => { const s = createConnection(PORT, '127.0.0.1'); s.once('data', () => r(s)); })));
		const code = await new Promise<number>((r) => { const s = createConnection(PORT, '127.0.0.1'); s.once('data', (d) => { r(Number(d.toString().slice(0, 3))); s.destroy(); }); });
		expect(code).toBe(421);
		for (const s of open) s.destroy();
	});

	it('hangs up after too many unknown recipients, also across RSET', async () => {
		await new Promise((r) => setTimeout(r, 50));
		const codes = await talk(['EHLO x', 'MAIL FROM:<a@b.de>', 'RCPT TO:<a1@test.e-mail-check.de>', 'RSET', 'MAIL FROM:<a@b.de>', 'RCPT TO:<a2@test.e-mail-check.de>', 'RCPT TO:<a3@test.e-mail-check.de>', 'RCPT TO:<a4@test.e-mail-check.de>', 'RCPT TO:<a5@test.e-mail-check.de>']);
		expect(codes.filter((c) => c === 550)).toHaveLength(3);
		expect(codes).toContain(421);
	});
});

describe('I2: no test stays on "analyzing" forever', () => {
	it('marks analyses interrupted by a restart as failed', () => {
		const store = new Store(':memory:');
		store.createTest({ id: 'x'.repeat(22), local: 'abcdefgh', createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 3600_000).toISOString() });
		store.setTestState('x'.repeat(22), 'analyzing');
		new TestService({ store, testDomain: 't', testTtlMinutes: 60, deps: { resolver: fakeResolver(), mta: 'm', resultTtlDays: 7, scanContent: null } });
		expect(store.getTest('x'.repeat(22))?.state).toBe('error');
	});

	it('fails a hanging analysis after the timeout and says so', async () => {
		const store = new Store(':memory:');
		const hang = () => new Promise<never>(() => undefined);
		const service = new TestService({ store, testDomain: 'test.e-mail-check.de', testTtlMinutes: 60, analysisTimeoutMs: 50, deps: { resolver: hang, mta: 'm', resultTtlDays: 7, scanContent: null } });
		const test = service.createTest();
		const events: ProgressEvent[] = [];
		service.subscribe(test.id, (e) => events.push(e));
		const r = await service.handleMessage(test.address, fixture('gut.eml'), { ip: GOOD_IP, helo: 'x', sender: 'max@gut.example.test', tls: null });
		expect(r).toBeUndefined();
		expect(service.status(test.id)?.state).toBe('error');
		expect(events.at(-1)?.type).toBe('error');
		expect(store.mailsChecked()).toBe(0);
	});

	it('runs at most N analyses at once', async () => {
		let running = 0;
		let peak = 0;
		const slow = async (...a: Parameters<ReturnType<typeof fakeResolver>>) => {
			running++;
			peak = Math.max(peak, running);
			await new Promise((r) => setTimeout(r, 20));
			running--;
			return fakeResolver()(...a);
		};
		const service = new TestService({ store: new Store(':memory:'), testDomain: 'test.e-mail-check.de', testTtlMinutes: 60, maxParallel: 1, deps: { resolver: slow, mta: 'm', resultTtlDays: 7, scanContent: null } });
		const tests = [service.createTest(), service.createTest(), service.createTest()];
		await Promise.all(tests.map((t) => service.handleMessage(t.address, fixture('gut.eml'), { ip: GOOD_IP, helo: 'x', sender: 'max@gut.example.test', tls: null })));
		expect(tests.every((t) => service.status(t.id)?.state === 'done')).toBe(true);
		// One analysis at a time still queries several names in parallel; three at once would be far more.
		expect(peak).toBeLessThan(25);
	});
});

describe('I3: a DNS outage is not a server without a name', () => {
	it('skips the reputation check instead of deducting points', async () => {
		const down = async () => {
			throw Object.assign(new Error('queryA ESERVFAIL'), { code: 'ESERVFAIL' });
		};
		const f = await checkReputation(GOOD_IP, down);
		expect(f.status).toBe('skip');
		expect(f.deductions).toEqual([]);
	});

	it('still deducts for a real missing PTR', async () => {
		const f = await checkReputation('203.0.113.99', fakeResolver());
		expect(f.deductions.some((d) => d.reason.includes('rDNS'))).toBe(true);
	});
});
