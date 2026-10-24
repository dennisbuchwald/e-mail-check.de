// Inbound SMTP for test addresses. Messages stay in memory and are dropped after analysis.
import { SMTPServer, type SMTPServerOptions, type SMTPServerSession } from 'smtp-server';
import type { TestService } from './service.ts';

export interface SmtpOptions {
	hostname: string;
	maxMessageBytes: number;
	allowXclient: boolean;
	tls?: { key: Buffer; cert: Buffer };
	/** Open connections per client IP (50 idle connections used to lock everyone out). */
	maxPerIp?: number;
	/** Unknown recipients per session before we hang up (no probing for live test addresses). */
	maxBadRcpt?: number;
}

type Session = SMTPServerSession & { tlsProtocol?: string | null; tlsCipher?: string | null; badRcpt?: number; connIp?: string };
const fail = (message: string, responseCode: number) => Object.assign(new Error(message), { responseCode });

export function createSmtpServer(service: TestService, opts: SmtpOptions): SMTPServer {
	const perIp = new Map<string, number>();
	const maxPerIp = opts.maxPerIp ?? 3;
	const maxBadRcpt = opts.maxBadRcpt ?? 10;
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
		onConnect(session, callback) {
			const ip = session.remoteAddress;
			const n = perIp.get(ip) ?? 0;
			if (n >= maxPerIp) return callback(fail('Too many connections from your address, try again later', 421));
			perIp.set(ip, n + 1);
			// XCLIENT may change remoteAddress later; the slot belongs to the address that connected.
			(session as Session).connIp = ip;
			callback();
		},
		onClose(session) {
			const ip = (session as Session).connIp;
			if (!ip) return;
			const n = (perIp.get(ip) ?? 1) - 1;
			if (n <= 0) perIp.delete(ip);
			else perIp.set(ip, n);
		},
		// The negotiated protocol, not the cipher's minimum version (TLS 1.2 with a CBC suite read as TLSv1.0).
		onSecure(socket, session, callback) {
			(session as Session).tlsProtocol = (socket as unknown as { getProtocol?: () => string | null }).getProtocol?.() ?? null;
			const cipher = (socket as unknown as { getCipher?: () => { name?: string; standardName?: string } | null }).getCipher?.();
			(session as Session).tlsCipher = cipher?.standardName ?? cipher?.name ?? null;
			callback();
		},
		onRcptTo(address, session, callback) {
			const s = session as Session;
			if (session.envelope.rcptTo.length >= 5) return callback(fail('Too many recipients', 452));
			if (!service.acceptsRecipient(address.address)) {
				s.badRcpt = (s.badRcpt ?? 0) + 1;
				// After a few misses (RSET does not reset this) the session ends: no guessing of live addresses.
				if (s.badRcpt >= maxBadRcpt) return callback(fail('Too many unknown recipients, closing', 421));
				return callback(fail('5.1.1 Unknown or expired test address', 550));
			}
			callback();
		},
		onData(stream, session, callback) {
			// Keep at most the limit in memory (chunks used to pile up until the end of DATA).
			const chunks: Buffer[] = [];
			let bytes = 0;
			stream.on('data', (c: Buffer) => {
				bytes += c.length;
				if (bytes <= opts.maxMessageBytes) chunks.push(c);
			});
			stream.on('error', () => {
				chunks.length = 0;
			});
			stream.on('end', () => {
				if ((stream as unknown as { sizeExceeded?: boolean }).sizeExceeded || bytes > opts.maxMessageBytes) {
					chunks.length = 0;
					return callback(fail('Message too large', 552));
				}
				// Read the envelope before callback(): smtp-server resets it right after.
				const recipients = session.envelope.rcptTo.map((r) => r.address);
				const env = {
					ip: session.remoteAddress,
					helo: session.hostNameAppearsAs ?? '',
					sender: session.envelope.mailFrom ? session.envelope.mailFrom.address : '',
					tls: session.secure ? { version: (session as Session).tlsProtocol ?? (session as unknown as { tlsOptions?: { version?: string } }).tlsOptions?.version ?? null, cipher: (session as Session).tlsCipher ?? null } : null,
				};
				const message = Buffer.concat(chunks);
				chunks.length = 0;
				// Accept first so the sender is not kept waiting, then analyze (queued in the service).
				callback();
				for (const rcpt of recipients) void service.handleMessage(rcpt, message, env);
			});
		},
	};
	const server = new SMTPServer(options);
	server.on('error', (err) => console.error('smtp error', err.message));
	return server;
}
