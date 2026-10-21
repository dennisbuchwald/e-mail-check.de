// Sender reputation: reverse DNS (PTR) and DNS blocklists.
import { isIP } from 'node:net';
import { POINTS, round1, type Finding } from '@emc/shared';
import { isNotFound, type DnsResolver } from '../dns.ts';

export interface Blocklist {
	name: string;
	zone: string;
	major: boolean;
	ipv6: boolean;
	/** Answers that mean "query refused", not "listed" (e.g. Spamhaus via public resolver). */
	errorAnswers?: string[];
	/** Answers that only mean "end-user IP range" (Spamhaus PBL), not "spam seen". */
	pblAnswers?: string[];
	delistUrl: string;
}

// Selection documented in docs/scoring.md. UCEPROTECT is left out on purpose (paid delisting).
export const BLOCKLISTS: Blocklist[] = [
	{
		name: 'Spamhaus ZEN',
		zone: 'zen.spamhaus.org',
		major: true,
		ipv6: true,
		errorAnswers: ['127.255.255.252', '127.255.255.254', '127.255.255.255'],
		pblAnswers: ['127.0.0.10', '127.0.0.11'],
		delistUrl: 'https://check.spamhaus.org/',
	},
	{ name: 'SpamCop', zone: 'bl.spamcop.net', major: false, ipv6: false, delistUrl: 'https://www.spamcop.net/bl.shtml' },
	{ name: 'Barracuda', zone: 'b.barracudacentral.org', major: false, ipv6: false, delistUrl: 'https://www.barracudacentral.org/lookups' },
	{ name: 'PSBL', zone: 'psbl.surriel.com', major: false, ipv6: false, delistUrl: 'https://psbl.org/' },
];

export function isPrivateIp(ip: string): boolean {
	const v = ip.replace(/^::ffff:/i, '');
	if (isIP(v) === 4) {
		const [a, b] = v.split('.').map(Number);
		return a === 10 || a === 127 || a === 0 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254) || (a === 100 && b >= 64 && b <= 127);
	}
	const l = v.toLowerCase();
	return l === '::1' || l === '::' || l.startsWith('fc') || l.startsWith('fd') || l.startsWith('fe80');
}

/** 1.2.3.4 → 4.3.2.1 ; IPv6 → reversed nibbles. */
export function reverseIp(ip: string): string {
	const v = ip.replace(/^::ffff:/i, '');
	if (isIP(v) === 4) return v.split('.').reverse().join('.');
	return expandIpv6(v).replace(/:/g, '').split('').reverse().join('.');
}

function expandIpv6(ip: string): string {
	const [head, tail = ''] = ip.split('::');
	const h = head ? head.split(':') : [];
	const t = tail ? tail.split(':') : [];
	const fill = ip.includes('::') ? Array(8 - h.length - t.length).fill('0') : [];
	return [...h, ...fill, ...t].map((g) => g.padStart(4, '0')).join(':');
}

type ListResult = { list: string; listed: boolean | null; answer?: string; pbl?: boolean; delistUrl: string; major: boolean };

async function queryList(resolve: DnsResolver, ip: string, list: Blocklist): Promise<ListResult> {
	const name = `${reverseIp(ip)}.${list.zone}`;
	const out = { list: list.name, delistUrl: list.delistUrl, major: list.major };
	try {
		const answers: string[] = await resolve(name, 'A');
		const real = answers.filter((a) => a.startsWith('127.') && !(list.errorAnswers ?? []).includes(a));
		if (real.length === 0) return { ...out, listed: answers.length > 0 ? null : false };
		const pbl = real.every((a) => (list.pblAnswers ?? []).includes(a));
		return { ...out, listed: true, answer: real.join(','), ...(pbl ? { pbl: true } : {}) };
	} catch (err) {
		return { ...out, listed: isNotFound(err) ? false : null };
	}
}

async function checkPtr(resolve: DnsResolver, ip: string): Promise<{ ptr: string | null; matches: boolean }> {
	const v = ip.replace(/^::ffff:/i, '');
	const rev = `${reverseIp(v)}.${isIP(v) === 4 ? 'in-addr.arpa' : 'ip6.arpa'}`;
	let names: string[] = [];
	try {
		names = await resolve(rev, 'PTR');
	} catch {
		return { ptr: null, matches: false };
	}
	for (const host of names) {
		try {
			const addrs: string[] = await resolve(host, isIP(v) === 4 ? 'A' : 'AAAA');
			if (addrs.some((a) => a.toLowerCase() === v.toLowerCase())) return { ptr: host, matches: true };
		} catch {
			// try next PTR name
		}
	}
	return { ptr: names[0] ?? null, matches: false };
}

export async function checkReputation(ip: string, resolve: DnsResolver, lists: Blocklist[] = BLOCKLISTS): Promise<Finding> {
	const base = { id: 'reputation' as const, tech: 'Sperrlisten & rDNS' };
	if (!isIP(ip.replace(/^::ffff:/i, '')) || isPrivateIp(ip)) {
		return {
			...base,
			status: 'skip',
			title: 'Server-Ruf nicht geprüft',
			text: 'Die Mail kam aus einem lokalen Netz. Sperrlisten gelten nur für Server im Internet.',
			deductions: [],
			raw: { ip },
		};
	}
	const v6 = isIP(ip.replace(/^::ffff:/i, '')) === 6;
	const [ptr, ...results] = await Promise.all([checkPtr(resolve, ip), ...lists.filter((l) => !v6 || l.ipv6).map((l) => queryList(resolve, ip, l))]);
	const listed = results.filter((r) => r.listed === true);
	const deductions = [];
	let listPoints = 0;
	for (const r of listed) listPoints += r.major ? POINTS.reputation.majorList : POINTS.reputation.otherList;
	if (listed.length > 0) {
		deductions.push({ reason: `Auf Sperrliste: ${listed.map((r) => r.list).join(', ')}`, points: round1(Math.min(POINTS.reputation.listCap, listPoints)) });
	}
	if (!ptr.ptr) deductions.push({ reason: 'Kein rDNS-Eintrag (PTR)', points: POINTS.reputation.noPtr });
	else if (!ptr.matches) deductions.push({ reason: 'rDNS passt nicht zur IP', points: POINTS.reputation.ptrMismatch });

	const raw = { ip, ptr: ptr.ptr, ptrMatches: ptr.matches, lists: results };
	// Only Spamhaus PBL: an ordinary internet connection sends straight to the recipient.
	// Not an accusation of spam, but big providers refuse it, so the points stay.
	if (listed.length > 0 && listed.every((r) => r.pbl)) {
		return {
			...base,
			status: 'bad',
			title: 'Versand direkt vom Internetanschluss',
			text: `Die Mail kam direkt von ${ip}. Spamhaus führt diese Adresse in seiner Liste für normale Internetanschlüsse (PBL). Das ist kein Spam-Vorwurf, aber Gmail, Outlook und Co. nehmen von solchen Adressen keine Mails direkt an. Lösung: Verschick über den Postausgangsserver (SMTP mit Anmeldung) deines Mail-Anbieters. Das betrifft oft Kontaktformulare auf eigenen Servern, Scanner oder einen eigenen Mailserver im Büro. Austragen lohnt sich nur, wenn du an dieser Adresse bewusst einen eigenen Mailserver mit fester IP betreibst.`,
			deductions,
			raw,
		};
	}
	if (listed.length > 0) {
		return {
			...base,
			status: 'bad',
			title: 'Server auf Sperrliste',
			text: `Der Server, der deine Mail verschickt hat (${ip}), steht auf ${listed.length === 1 ? 'der Sperrliste' : 'den Sperrlisten'} ${listed.map((r) => r.list).join(', ')}. Viele Empfänger lehnen Mails von dort ab. Bei einem Mail-Anbieter: Support kontaktieren. Bei eigenem Server: über die Website der Liste austragen lassen.`,
			deductions,
			raw,
		};
	}
	if (!ptr.ptr) {
		return {
			...base,
			status: 'bad',
			title: 'Server ohne Namen',
			text: `Der Server ${ip} hat keinen Rückwärts-Eintrag (rDNS). Große Anbieter lehnen Mails von solchen Servern oft ab. Den Eintrag setzt der Betreiber des Servers.`,
			deductions,
			raw,
		};
	}
	if (!ptr.matches) {
		return {
			...base,
			status: 'warn',
			title: 'Server-Name passt nicht',
			text: `Der Server ${ip} heißt laut rDNS „${ptr.ptr}“, aber dieser Name zeigt nicht zurück auf die IP. Den Eintrag korrigiert der Betreiber des Servers.`,
			deductions,
			raw,
		};
	}
	const unknown = results.filter((r) => r.listed === null).length;
	return {
		...base,
		status: 'ok',
		title: 'Server-Ruf gut',
		text: `Der Server ${ptr.ptr} steht auf keiner der ${results.length - unknown} geprüften Sperrlisten.`,
		deductions,
		raw,
	};
}
