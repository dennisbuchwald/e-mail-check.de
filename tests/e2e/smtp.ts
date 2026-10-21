import { createConnection } from 'node:net';

/** Sends a mail to the local SMTP intake. XCLIENT simulates the sender IP (local stack only). */
export function sendMail(to: string, opts: { from: string; ip: string; helo: string; subject: string; body: string; port?: number }): Promise<number[]> {
	const msg = [
		`From: Test <${opts.from}>`,
		`To: ${to}`,
		`Subject: ${opts.subject}`,
		`Date: ${new Date().toUTCString()}`,
		`Message-ID: <${Date.now()}@e2e.test>`,
		'MIME-Version: 1.0',
		'Content-Type: text/plain; charset=utf-8',
		'',
		opts.body,
	].join('\r\n');
	const commands = [`EHLO ${opts.helo}`, `XCLIENT ADDR=${opts.ip}`, `EHLO ${opts.helo}`, `MAIL FROM:<${opts.from}>`, `RCPT TO:<${to}>`, 'DATA', `${msg}\r\n.`, 'QUIT'];
	return new Promise((resolve, reject) => {
		const sock = createConnection(opts.port ?? 2525, '127.0.0.1');
		const codes: number[] = [];
		let buf = '';
		let i = 0;
		sock.on('data', (d) => {
			buf += d.toString();
			let m: RegExpExecArray | null;
			while ((m = /^(\d{3}) .*\r\n/m.exec(buf))) {
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
