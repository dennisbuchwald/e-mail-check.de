// Inbound SMTP for test addresses. Messages stay in memory and are dropped after analysis.
import { SMTPServer, type SMTPServerOptions } from 'smtp-server';
import type { TestService } from './service.ts';

export interface SmtpOptions {
	hostname: string;
	maxMessageBytes: number;
	allowXclient: boolean;
	tls?: { key: Buffer; cert: Buffer };
}

export function createSmtpServer(service: TestService, opts: SmtpOptions): SMTPServer {
	const options: SMTPServerOptions = {
		name: opts.hostname,
		banner: 'e-mail-check.de Testempfang',
		size: opts.maxMessageBytes,
		authOptional: true,
		disabledCommands: opts.tls ? ['AUTH'] : ['AUTH', 'STARTTLS'],
		useXClient: opts.allowXclient,
		maxClients: 50,
		socketTimeout: 60_000,
		logger: false,
		...(opts.tls ?? {}),
		onRcptTo(address, session, callback) {
			if (session.envelope.rcptTo.length >= 5) return callback(Object.assign(new Error('Too many recipients'), { responseCode: 452 }));
			if (!service.acceptsRecipient(address.address)) {
				return callback(Object.assign(new Error('5.1.1 Unknown or expired test address'), { responseCode: 550 }));
			}
			callback();
		},
		onData(stream, session, callback) {
			const chunks: Buffer[] = [];
			stream.on('data', (c: Buffer) => chunks.push(c));
			stream.on('end', () => {
				if ((stream as unknown as { sizeExceeded?: boolean }).sizeExceeded) {
					return callback(Object.assign(new Error('Message too large'), { responseCode: 552 }));
				}
				// Read the envelope before callback(): smtp-server resets it right after.
				const recipients = session.envelope.rcptTo.map((r) => r.address);
				const env = {
					ip: session.remoteAddress,
					helo: session.hostNameAppearsAs ?? '',
					sender: session.envelope.mailFrom ? session.envelope.mailFrom.address : '',
				};
				const message = Buffer.concat(chunks);
				chunks.length = 0;
				// Accept first so the sender is not kept waiting, then analyze.
				callback();
				for (const rcpt of recipients) void service.handleMessage(rcpt, message, env);
			});
		},
	};
	const server = new SMTPServer(options);
	server.on('error', (err) => console.error('smtp error', err.message));
	return server;
}
