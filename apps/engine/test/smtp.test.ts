import { createConnection } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { ProgressEvent } from '@emc/shared';
import { createSmtpServer } from '../src/smtp.ts';
import { TestService } from '../src/service.ts';
import { Store } from '../src/store.ts';
import { fakeResolver, fixture, GOOD_IP } from './helpers.ts';

const PORT = 25251;
const store = new Store(':memory:');
const service = new TestService({
	store,
	testDomain: 'test.e-mail-check.de',
	testTtlMinutes: 60,
	deps: { resolver: fakeResolver(), mta: 'mx.test', resultTtlDays: 7, scanContent: async () => ({ score: 0, symbols: [] }) },
});
const server = createSmtpServer(service, { hostname: 'mx.test', maxMessageBytes: 1024 * 1024, allowXclient: true });

beforeAll(() => new Promise<void>((r) => server.listen(PORT, r)));
afterAll(() => new Promise<void>((r) => server.close(() => r())));

/** Minimal SMTP client: sends commands one by one, returns the reply codes. */
function smtp(commands: string[]): Promise<number[]> {
	return new Promise((resolve, reject) => {
		const sock = createConnection(PORT, '127.0.0.1');
		const codes: number[] = [];
		let buf = '';
		let i = 0;
		sock.on('data', (d) => {
			buf += d.toString();
			// A complete reply ends with "NNN text\r\n" (no dash after the code).
			while (/^\d{3} .*\r\n/m.test(buf)) {
				const m = /^(\d{3}) .*\r\n/m.exec(buf)!;
				codes.push(Number(m[1]));
				buf = buf.slice(m.index + m[0].length);
				if (i < commands.length) sock.write(commands[i++] + '\r\n');
				else sock.end();
			}
		});
		sock.on('end', () => resolve(codes));
		sock.on('error', reject);
	});
}

describe('SMTP intake', () => {
	it('rejects unknown addresses', async () => {
		const codes = await smtp(['EHLO x', 'MAIL FROM:<a@b.de>', 'RCPT TO:<nobody@test.e-mail-check.de>', 'QUIT']);
		expect(codes).toContain(550);
	});

	it('accepts a test address, analyzes the mail and emits progress', async () => {
		const test = service.createTest();
		const events: ProgressEvent[] = [];
		const done = new Promise<void>((r) =>
			service.subscribe(test.id, (e) => {
				events.push(e);
				if (e.type === 'done') r();
			}),
		);
		const body = fixture('gut.eml').toString().replace(/\r\n\./g, '\r\n..');
		const codes = await smtp([
			'EHLO mail.gut.example.test',
			`XCLIENT ADDR=${GOOD_IP}`,
			'EHLO mail.gut.example.test',
			'MAIL FROM:<max@gut.example.test>',
			`RCPT TO:<${test.address}>`,
			'DATA',
			body + '\r\n.',
			'QUIT',
		]);
		expect(codes.slice(-3)).toEqual([354, 250, 221]);
		await done;
		expect(events.filter((e) => e.type === 'step').map((e) => (e as { step: string }).step)).toEqual(['received', 'spf', 'dkim', 'dmarc', 'reputation', 'content']);
		const status = service.status(test.id)!;
		expect(status.state).toBe('done');
		const result = service.result(status.resultId!)!;
		// Test client sends without STARTTLS: only the transport hint (−0,5).
		expect(result.score).toBe(9.5);
		expect(result.findings.find((f) => f.id === 'transport')?.status).toBe('warn');
		// A used address does not accept a second mail.
		expect(service.acceptsRecipient(test.address)).toBe(false);
	});
});
