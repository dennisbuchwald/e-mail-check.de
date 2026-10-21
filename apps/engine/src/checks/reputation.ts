// Sender reputation: reverse DNS (PTR) and DNS blocklists.
import { isIP } from 'node:net';
import { POINTS, round1, type Finding } from '@emc/shared';
import { isNotFound, type DnsResolver } from '../dns.ts';
import { bigSenderOf } from './senders.ts';

export interface Blocklist {
	name: string;
	zone: string;
	major: boolean;
	ipv6: boolean;
	/** Answers that mean "query refused", not "listed" (e.g. Spamhaus via public resolver). */
	errorAnswers?: string[];
	/** Answers that only mean "end-user IP range" (Spamhaus PBL), not "spam seen". */
	pblAnswers?: string[];
	/** Positive list ("good reputation"): a hit is shown as a plus, never deducted. */
	allow?: boolean;
	/** Only answers matching this count as a hit (lists with graded or informational codes). */
	match?: RegExp;
	delistUrl: string;
}

// Only lists that may be queried for free without an account
// (checked 21.10.2026). Left out: UCEPROTECT and Backscatterer (paid fast delisting), Barracuda (needs a registered
// resolver), SpamRATS (needs an API key), SORBS, NiX Spam, LashBack, WPBL (shut down or not answering).
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
	{ name: 'SpamCop', zone: 'bl.spamcop.net', major: true, ipv6: false, delistUrl: 'https://www.spamcop.net/bl.shtml' },
	{ name: 'PSBL', zone: 'psbl.surriel.com', major: true, ipv6: false, delistUrl: 'https://psbl.org/' },
	// Mailspike grades reputation; only "part of a spam wave" (.2) and the two worst levels L5/L4 (.10/.11) count.
	{ name: 'Mailspike', zone: 'bl.mailspike.net', major: false, ipv6: false, match: /^127\.0\.0\.(2|10|11)$/, delistUrl: 'https://mailspike.io/ip_verify' },
	{ name: 'Truncate (GBUdb)', zone: 'truncate.gbudb.net', major: false, ipv6: false, delistUrl: 'http://www.gbudb.com/truncate/' },
	{ name: 'NordSpam', zone: 'bl.nordspam.com', major: false, ipv6: true, delistUrl: 'https://www.nordspam.com/delist/' },
	{ name: 's5h.net', zone: 'all.s5h.net', major: false, ipv6: true, delistUrl: 'http://www.usenix.org.uk/content/rbl.html' },
	{ name: '0spam', zone: 'bl.0spam.org', major: false, ipv6: false, delistUrl: 'https://www.0spam.org/' },
	{ name: 'DroneBL', zone: 'dnsbl.dronebl.org', major: false, ipv6: false, delistUrl: 'https://dronebl.org/lookup' },
	{ name: 'blocklist.de', zone: 'bl.blocklist.de', major: false, ipv6: false, delistUrl: 'https://www.blocklist.de/en/delist.html' },
	// Positive lists: shown as "good reputation", never deducted or weighed against blocklists.
	{ name: 'DNSWL', zone: 'list.dnswl.org', major: false, ipv6: false, allow: true, errorAnswers: ['127.0.0.255'], match: /^127\.0\.\d+\.[1-3]$/, delistUrl: 'https://www.dnswl.org/' },
	{ name: 'Mailspike Positivliste', zone: 'wl.mailspike.net', major: false, ipv6: false, allow: true, match: /^127\.0\.0\.(18|19|20)$/, delistUrl: 'https://mailspike.io/' },
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

type ListResult = { list: string; listed: boolean | null; answer?: string; pbl?: boolean; delistUrl: string; major: boolean; allow?: boolean };

async function queryList(resolve: DnsResolver, ip: string, list: Blocklist): Promise<ListResult> {
	const name = `${reverseIp(ip)}.${list.zone}`;
	const out = { list: list.name, delistUrl: list.delistUrl, major: list.major, ...(list.allow ? { allow: true } : {}) };
	try {
		const answers: string[] = await resolve(name, 'A');
		const valid = answers.filter((a) => a.startsWith('127.') && !(list.errorAnswers ?? []).includes(a));
		if (answers.length > 0 && valid.length === 0) return { ...out, listed: null };
		const real = list.match ? valid.filter((a) => list.match!.test(a)) : valid;
		if (real.length === 0) return { ...out, listed: false };
		const pbl = real.every((a) => (list.pblAnswers ?? []).includes(a));
		return { ...out, listed: true, answer: real.join(','), ...(pbl ? { pbl: true } : {}) };
	} catch (err) {
		return { ...out, listed: isNotFound(err) ? false : null };
	}
}

async function checkPtr(resolve: DnsResolver, ip: string): Promise<{ ptr: string | null; matches: boolean; unknown?: boolean }> {
	const v = ip.replace(/^::ffff:/i, '');
	const rev = `${reverseIp(v)}.${isIP(v) === 4 ? 'in-addr.arpa' : 'ip6.arpa'}`;
	let names: string[] = [];
	try {
		names = await resolve(rev, 'PTR');
	} catch (err) {
		// Only "no such record" means no rDNS; a timeout or SERVFAIL says nothing about the server.
		return { ptr: null, matches: false, ...(isNotFound(err) ? {} : { unknown: true }) };
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

/** HELO name the server introduced itself with: does it match the rDNS name or point back to the IP? */
async function checkHelo(resolve: DnsResolver, helo: string | undefined, ip: string, ptr: string | null): Promise<{ name: string | null; matches: boolean }> {
	const name = (helo ?? '').trim().toLowerCase().replace(/\.$/, '');
	if (!name) return { name: null, matches: false };
	if (ptr && name === ptr.toLowerCase()) return { name, matches: true };
	try {
		const v = ip.replace(/^::ffff:/i, '');
		const addrs: string[] = await resolve(name, isIP(v) === 4 ? 'A' : 'AAAA');
		return { name, matches: addrs.some((a) => a.toLowerCase() === v.toLowerCase()) };
	} catch {
		return { name, matches: false };
	}
}

export async function checkReputation(ip: string, resolve: DnsResolver, lists: Blocklist[] = BLOCKLISTS, helo?: string): Promise<Finding> {
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
	const [ptr, ...all] = await Promise.all([checkPtr(resolve, ip), ...lists.filter((l) => !v6 || l.ipv6).map((l) => queryList(resolve, ip, l))]);
	const results = all.filter((r) => !r.allow);
	const allowLists = all.filter((r) => r.allow);
	const helo_ = await checkHelo(resolve, helo, ip, ptr.ptr);
	const listed = results.filter((r) => r.listed === true);
	const answered = results.filter((r) => r.listed !== null).length;
	// No list answered and no rDNS answer either: the resolver is down, so we cannot say anything.
	if (listed.length === 0 && answered === 0 && ptr.unknown) {
		return {
			...base,
			status: 'skip',
			title: 'Server-Ruf nicht geprüft',
			text: 'Die Sperrlisten und der Namens-Eintrag waren gerade nicht erreichbar. Teste später noch einmal.',
			deductions: [],
			raw: { ip, error: 'dns_unavailable', lists: results, allowLists },
		};
	}
	// Major lists decide; small, aggressive ones are a hint. A big sender (Google, Microsoft …) is not the tester's to fix.
	const major = listed.filter((r) => r.major);
	const small = listed.filter((r) => !r.major);
	const bigSender = bigSenderOf(ptr.matches ? ptr.ptr : null, helo_.matches ? helo_.name : null);
	const deductions = [];
	if (!bigSender && major.length > 0) {
		deductions.push({ reason: `Auf Sperrliste: ${major.map((r) => r.list).join(', ')}`, points: round1(Math.min(POINTS.reputation.listCap, major.length * POINTS.reputation.majorList)) });
	}
	if (!bigSender && small.length > 0) {
		deductions.push({ reason: `Auf kleiner Sperrliste: ${small.map((r) => r.list).join(', ')}`, points: round1(Math.min(POINTS.reputation.smallListCap, small.length * POINTS.reputation.smallList)) });
	}
	if (!ptr.ptr && !ptr.unknown) deductions.push({ reason: 'Kein rDNS-Eintrag (PTR)', points: POINTS.reputation.noPtr });
	else if (ptr.ptr && !ptr.matches) deductions.push({ reason: 'rDNS passt nicht zur IP', points: POINTS.reputation.ptrMismatch });

	const raw = { ip, ptr: ptr.ptr, ptrMatches: ptr.matches, ...(ptr.unknown ? { ptrUnknown: true } : {}), helo: helo_.name, heloMatches: helo_.matches, lists: results, allowLists, ...(bigSender ? { bigSender } : {}) };
	if (bigSender && listed.length > 0) {
		return {
			...base,
			status: 'ok',
			title: `Server von ${bigSender}`,
			text: `Liegt nicht in deiner Hand: Der Server gehört ${bigSender} (${ptr.ptr ?? helo_.name}). ${listed.map((r) => r.list).join(' und ')} ${listed.length === 1 ? 'führt' : 'führen'} ihn, aber kleine Listen führen solche Server manchmal fälschlich. Das kostet keine Punkte.`,
			deductions,
			raw,
		};
	}
	// Only Spamhaus PBL: an ordinary internet connection sends straight to the recipient.
	// Not an accusation of spam, but big providers refuse it, so the points stay.
	if (major.length > 0 && major.every((r) => r.pbl) && small.length === 0) {
		return {
			...base,
			status: 'bad',
			title: 'Versand direkt vom Internetanschluss',
			text: `Die Mail kam direkt von ${ip}. Spamhaus führt diese Adresse in seiner Liste für normale Internetanschlüsse (PBL). Das ist kein Spam-Vorwurf, aber Gmail, Outlook und Co. nehmen von solchen Adressen keine Mails direkt an. Lösung: Verschick über den Postausgangsserver (SMTP mit Anmeldung) deines Mail-Anbieters. Das betrifft oft Kontaktformulare auf eigenen Servern, Scanner oder einen eigenen Mailserver im Büro. Austragen lohnt sich nur, wenn du an dieser Adresse bewusst einen eigenen Mailserver mit fester IP betreibst.`,
			deductions,
			raw,
		};
	}
	if (major.length > 0) {
		return {
			...base,
			status: 'bad',
			title: 'Server auf Sperrliste',
			text: `Der Server, der deine Mail verschickt hat (${ip}), steht auf ${listed.length === 1 ? 'der Sperrliste' : 'den Sperrlisten'} ${listed.map((r) => r.list).join(', ')}. Viele Empfänger lehnen Mails von dort ab. Bei einem Mail-Anbieter: Support kontaktieren. Bei eigenem Server: über die Website der Liste austragen lassen.`,
			deductions,
			raw,
		};
	}
	if (!ptr.ptr && !ptr.unknown) {
		return {
			...base,
			status: 'bad',
			title: 'Server ohne Namen',
			text: `Der Server ${ip} hat keinen Rückwärts-Eintrag (rDNS). Große Anbieter lehnen Mails von solchen Servern oft ab. Den Eintrag setzt der Betreiber des Servers.`,
			deductions,
			raw,
		};
	}
	if (small.length > 0) {
		return {
			...base,
			status: 'warn',
			title: 'Auf einer kleinen Sperrliste',
			text: `Der Server ${ip} steht auf ${small.length === 1 ? 'der kleinen Liste' : 'den kleinen Listen'} ${small.map((r) => r.list).join(', ')}. Große Anbieter wie Gmail oder Outlook richten sich kaum danach, deshalb ist das nur ein Hinweis. Bei eigenem Server: über die Website der Liste austragen lassen.`,
			deductions,
			raw,
		};
	}
	if (ptr.ptr && !ptr.matches) {
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
		text: `Der Server ${ptr.ptr ?? ip} steht auf keiner der ${results.length - unknown} geprüften Sperrlisten.${ptr.unknown ? ' Den Namens-Eintrag (rDNS) konnten wir gerade nicht abfragen.' : ''}`,
		deductions,
		raw,
	};
}
