// Station 5 (Transport): TLS on the way to us and the delivery chain from the Received headers.
// Only server names ("by …") and times are kept, never the "from" part (it can contain the sender's own device or IP).
import { POINTS, type Finding } from '@emc/shared';

export interface Hop {
	host: string;
	/** Seconds after the first hop. */
	sec: number;
}

const HOST = /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i;

/** Received headers come newest first; returns hops oldest first, plus our own receipt as the last hop. */
export function parseHops(received: string[], ourHost: string, receivedAt: Date): { hops: Hop[]; durationSec: number | null } {
	const raw: { host: string; at: number | null }[] = [];
	for (const value of received.slice().reverse()) {
		const by = /\bby\s+([^\s;()]+)/i.exec(value)?.[1]?.toLowerCase() ?? '';
		const date = Date.parse(value.slice(value.lastIndexOf(';') + 1).trim());
		if (HOST.test(by)) raw.push({ host: by, at: Number.isNaN(date) ? null : date });
	}
	raw.push({ host: ourHost, at: receivedAt.getTime() });
	const timed = raw.filter((h) => h.at !== null);
	const first = timed[0]?.at ?? null;
	const hops = raw.slice(-8).map((h) => ({ host: h.host, sec: first !== null && h.at !== null ? Math.max(0, Math.round((h.at - first) / 1000)) : 0 }));
	// Received dates carry their own zone offset (Date.parse honours it) but come from different clocks:
	// a little skew is rounded to 0 (shown as "< 1 s"), clearly wrong values (negative, over an hour) are dropped.
	const span = first !== null && timed.length > 1 ? (timed[timed.length - 1].at! - first) / 1000 : null;
	const durationSec = span === null || span < -5 || span > 3600 ? null : Math.max(0, Math.round(span));
	return { hops, durationSec };
}

/** Human TLS label, e.g. "TLSv1.3" → "1.3". */
export function tlsLevel(version: string | null | undefined): string | null {
	const m = /(\d\.\d)/.exec(version ?? '');
	return m ? m[1] : null;
}

export function transportFinding(tls: { version: string | null; cipher?: string | null } | null | undefined, received: string[], ourHost: string, receivedAt: Date): Finding {
	const base = { id: 'transport' as const, tech: 'TLS, Zustellkette' };
	const { hops, durationSec } = parseHops(received, ourHost, receivedAt);
	const level = tls ? tlsLevel(tls.version) : null;
	// Cipher name and its key strength (from the name: AES_256, CHACHA20 = 256, AES_128 = 128).
	const cipher = tls?.cipher ?? null;
	const bits = cipher ? (/(AES_?256|CHACHA20)/i.test(cipher) ? 256 : /AES_?128/i.test(cipher) ? 128 : null) : null;
	const raw = { tls: { used: !!tls, version: tls?.version ?? null, level, ...(cipher ? { cipher, bits } : {}) }, hops, durationSec };
	if (!tls) {
		return {
			...base,
			status: 'warn',
			title: 'Unverschlüsselt übertragen',
			text: 'Deine Mail kam ohne Verschlüsselung bei uns an. Unterwegs hätte jemand mitlesen können. Große Anbieter erwarten heute TLS. Das stellt der Betreiber deines Mailservers ein.',
			deductions: [{ reason: 'Ohne TLS übertragen', points: POINTS.transport.noTls }],
			raw,
		};
	}
	if (level === '1.0' || level === '1.1') {
		return {
			...base,
			status: 'warn',
			title: 'Veraltete Verschlüsselung',
			text: `Deine Mail kam mit TLS ${level} an. Diese Version gilt als veraltet. Der Betreiber deines Mailservers sollte TLS 1.2 oder 1.3 aktivieren.`,
			deductions: [{ reason: `TLS ${level}`, points: POINTS.transport.oldTls }],
			raw,
		};
	}
	return {
		...base,
		status: 'ok',
		title: 'Verschlüsselt übertragen',
		text: `Deine Mail kam verschlüsselt${level ? ` mit TLS ${level}` : ''} bei uns an. Unterwegs konnte niemand mitlesen.`,
		deductions: [],
		raw,
	};
}
