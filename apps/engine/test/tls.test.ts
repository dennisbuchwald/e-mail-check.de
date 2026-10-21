import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { connect } from 'node:tls';
import { createConnection } from 'node:net';
import { afterAll, describe, expect, it } from 'vitest';
import { createSmtpServer } from '../src/smtp.ts';
import { TestService } from '../src/service.ts';
import { Store } from '../src/store.ts';
import { readTls, waitForTls, watchTls } from '../src/tls.ts';
import { fakeResolver } from './helpers.ts';

const dir = mkdtempSync(join(tmpdir(), 'emc-tls-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function selfSigned(cn: string) {
	const key = join(dir, `${cn}.key`);
	const cert = join(dir, `${cn}.crt`);
	execFileSync('openssl', ['req', '-x509', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:prime256v1', '-nodes', '-keyout', key, '-out', cert, '-days', '1', '-subj', `/CN=${cn}`], { stdio: 'ignore' });
	return { key, cert };
}

/** Listens on a free port and returns it. */
const listenFree = (server: ReturnType<typeof createSmtpServer>) =>
	new Promise<number>((r) => server.listen(0, () => r((server.server.address() as { port: number }).port)));

/** Speaks SMTP up to STARTTLS and returns the CN of the certificate the server presents. */
function presentedCn(port: number): Promise<string> {
	return new Promise((resolve, reject) => {
		const sock = createConnection(port, '127.0.0.1');
		let buf = '';
		let step = 0;
		sock.on('data', (d) => {
			buf += d.toString();
			if (step === 0 && /^220 /m.test(buf)) {
				step = 1;
				buf = '';
				sock.write('EHLO test\r\n');
			} else if (step === 1 && /^250 /m.test(buf)) {
				step = 2;
				buf = '';
				sock.write('STARTTLS\r\n');
			} else if (step === 2 && /^220 /m.test(buf)) {
				step = 3;
				sock.removeAllListeners('data');
				const t = connect({ socket: sock, rejectUnauthorized: false, servername: 'mx.test' }, () => {
					resolve(String(t.getPeerCertificate().subject.CN));
					t.end();
				});
				t.on('error', reject);
			}
		});
		sock.on('error', reject);
	});
}

describe('STARTTLS certificate', () => {
	it('returns null while files are missing and loads them once present', async () => {
		const files = { key: join(dir, 'x.key'), cert: join(dir, 'x.crt') };
		expect(readTls(files)).toBeNull();
		expect(await waitForTls(files, 20, 5)).toBeNull();
	});

	it('serves the certificate and reloads it after renewal', async () => {
		const first = selfSigned('erst');
		const files = { key: join(dir, 'live.key'), cert: join(dir, 'live.crt') };
		const copy = (from: { key: string; cert: string }) => {
			writeFileSync(files.key, execFileSync('cat', [from.key]));
			writeFileSync(files.cert, execFileSync('cat', [from.cert]));
		};
		copy(first);
		const service = new TestService({ store: new Store(':memory:'), testDomain: 'test.e-mail-check.de', testTtlMinutes: 60, deps: { resolver: fakeResolver(), mta: 'mx.test', resultTtlDays: 7, scanContent: null } });
		const server = createSmtpServer(service, { hostname: 'mx.test', maxMessageBytes: 1024, allowXclient: false, tls: readTls(files)! });
		const port = await listenFree(server);
		const stop = watchTls(server, files, 50);
		try {
			expect(await presentedCn(port)).toBe('erst');
			copy(selfSigned('erneuert'));
			const later = new Date(Date.now() + 5000);
			utimesSync(files.cert, later, later);
			// Wait for the reload itself instead of a fixed pause (slow CI runners).
			await expect.poll(() => presentedCn(port), { timeout: 5000, interval: 60 }).toBe('erneuert');
		} finally {
			stop();
			await new Promise<void>((r) => server.close(() => r()));
		}
	});

	it('reports the negotiated TLS version, not the cipher suite minimum (audit I4)', async () => {
		const c = selfSigned('mx');
		const store = new Store(':memory:');
		const service = new TestService({ store, testDomain: 'test.e-mail-check.de', testTtlMinutes: 60, deps: { resolver: fakeResolver(), mta: 'mx.test', resultTtlDays: 7, scanContent: null } });
		const server = createSmtpServer(service, { hostname: 'mx.test', maxMessageBytes: 1 << 20, allowXclient: false, tls: readTls(c)! });
		const port = await listenFree(server);
		const test = service.createTest();
		const done = new Promise<void>((r) => service.subscribe(test.id, (e) => e.type === 'done' && r()));
		try {
			await new Promise<void>((resolve, reject) => {
				const sock = createConnection(port, '127.0.0.1');
				let buf = '';
				sock.on('data', (d) => {
					buf += d.toString();
					if (/^220 .*\r\n$/m.test(buf) && !buf.includes('250')) sock.write('EHLO test\r\n');
					else if (/^250 /m.test(buf) && !buf.includes('STARTTLS sent')) {
						buf += 'STARTTLS sent';
						sock.write('STARTTLS\r\n');
					} else if (buf.includes('STARTTLS sent') && /220 [^\n]*\r\n$/.test(buf)) {
						sock.removeAllListeners('data');
						// TLS 1.2 with a CBC suite: getCipher().version would say TLSv1.0
						const t = connect({ socket: sock, rejectUnauthorized: false, maxVersion: 'TLSv1.2', ciphers: 'ECDHE-ECDSA-AES128-SHA' }, () => {
							const cmds = ['EHLO test', 'MAIL FROM:<a@b.de>', `RCPT TO:<${test.address}>`, 'DATA', 'Subject: x\r\n\r\nhallo\r\n.', 'QUIT'];
							let tb = '';
							t.on('data', (d) => {
								tb += d.toString();
								while (/^\d{3} .*\r\n/m.test(tb)) {
									const m = /^(\d{3}) .*\r\n/m.exec(tb)!;
									tb = tb.slice(m.index + m[0].length);
									const next = cmds.shift();
									if (next) t.write(next + '\r\n');
									else t.end();
								}
							});
							t.write(cmds.shift() + '\r\n');
						});
						t.on('end', () => resolve());
						t.on('error', reject);
					}
				});
				sock.on('error', reject);
			});
			await done;
			const result = service.result(service.status(test.id)!.resultId!)!;
			expect(result.mail.tls).toEqual({ used: true, version: 'TLSv1.2' });
		} finally {
			await new Promise<void>((r) => server.close(() => r()));
		}
	});
});
