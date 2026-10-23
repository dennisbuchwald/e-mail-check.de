// Minimal DNS query over UDP that reports the AD flag ("authenticated data"): our own resolver (unbound)
// validates DNSSEC, but node:dns hides that flag. Used only for the bonus checks (checks/security.ts).
import { createSocket } from 'node:dgram';
import { randomBytes } from 'node:crypto';

export const QTYPE = { A: 1, MX: 15, TXT: 16, SOA: 6, TLSA: 52 } as const;
export type QType = keyof typeof QTYPE;

/** rcode 0 = NOERROR, 2 = SERVFAIL, 3 = NXDOMAIN; count = answers of the asked type (RRSIGs not counted). */
export interface SecAnswer {
	rcode: number;
	ad: boolean;
	count: number;
}
export type SecLookup = (name: string, type: QType) => Promise<SecAnswer>;

/** Query with RD and AD set, plus EDNS0 with the DO bit, so a validating resolver reports the AD flag. */
export function buildQuery(id: number, name: string, type: QType): Buffer {
	const labels = name.replace(/\.$/, '').split('.').filter(Boolean);
	if (labels.some((l) => l.length > 63) || name.length > 253) throw new Error('invalid name');
	const qname = Buffer.concat([...labels.map((l) => Buffer.concat([Buffer.from([l.length]), Buffer.from(l, 'ascii')])), Buffer.from([0])]);
	const header = Buffer.alloc(12);
	header.writeUInt16BE(id, 0);
	header.writeUInt16BE(0x0120, 2); // RD + AD
	header.writeUInt16BE(1, 4); // QDCOUNT
	header.writeUInt16BE(1, 10); // ARCOUNT: the OPT record
	const question = Buffer.alloc(4);
	question.writeUInt16BE(QTYPE[type], 0);
	question.writeUInt16BE(1, 2); // IN
	// OPT: root name, type 41, UDP size 1232, extended rcode 0, version 0, DO bit, no data
	const opt = Buffer.from([0, 0, 41, 0x04, 0xd0, 0, 0, 0x80, 0, 0, 0]);
	return Buffer.concat([header, qname, question, opt]);
}

/** Skips a (possibly compressed) name and returns the offset after it. */
function skipName(buf: Buffer, at: number): number {
	let i = at;
	for (let guard = 0; guard < 128; guard++) {
		const len = buf[i];
		if (len === undefined) throw new Error('truncated');
		if (len === 0) return i + 1;
		if ((len & 0xc0) === 0xc0) return i + 2;
		i += len + 1;
	}
	throw new Error('name too long');
}

export function parseAnswer(buf: Buffer, id: number, type: QType): SecAnswer {
	if (buf.length < 12 || buf.readUInt16BE(0) !== id) throw new Error('bad response');
	const flags = buf.readUInt16BE(2);
	const qd = buf.readUInt16BE(4);
	const an = buf.readUInt16BE(6);
	let i = 12;
	for (let q = 0; q < qd; q++) i = skipName(buf, i) + 4;
	let count = 0;
	for (let a = 0; a < an && i < buf.length; a++) {
		i = skipName(buf, i);
		const rtype = buf.readUInt16BE(i);
		const rdlen = buf.readUInt16BE(i + 8);
		if (rtype === QTYPE[type]) count++;
		i += 10 + rdlen;
	}
	return { rcode: flags & 0x0f, ad: (flags & 0x0020) !== 0, count };
}

export function createSecLookup(server: string, timeoutMs = 3000): SecLookup {
	return (name, type) =>
		new Promise((resolve, reject) => {
			const id = randomBytes(2).readUInt16BE(0);
			const socket = createSocket(server.includes(':') ? 'udp6' : 'udp4');
			const done = (err: Error | null, value?: SecAnswer) => {
				clearTimeout(timer);
				socket.close();
				if (err) reject(err);
				else resolve(value!);
			};
			const timer = setTimeout(() => done(new Error('timeout')), timeoutMs);
			socket.on('error', (err) => done(err));
			socket.on('message', (msg) => {
				try {
					done(null, parseAnswer(msg, id, type));
				} catch (err) {
					done(err as Error);
				}
			});
			try {
				socket.send(buildQuery(id, name, type), 53, server);
			} catch (err) {
				done(err as Error);
			}
		});
}
