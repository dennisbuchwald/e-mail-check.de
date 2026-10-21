// Link check: dead links and URL shorteners in the message body.
// Links come from strangers' mails, so every request is SSRF-guarded: only public IPs, only ports 80/443,
// re-checked after every redirect. Unsubscribe links are never opened (that would unsubscribe the sender).
import http from 'node:http';
import https from 'node:https';
import { isIP } from 'node:net';
import type { DnsResolver } from '../dns.ts';

export const SHORTENERS = [
	'bit.ly', 'bitly.com', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly', 'rebrand.ly', 'cutt.ly',
	'shorturl.at', 'tiny.cc', 'rb.gy', 'bl.ink', 't.ly', 's.id', 'lnkd.in', 'shorte.st', 'adf.ly', 'v.gd', 'tiny.one',
	'short.io', 'soo.gd', 'clck.ru', 'qr.ae', 'urlz.fr', 'kurzelinks.de', 'kurzlink.de', 'gg.gg',
];

const UNSUBSCRIBE = /unsubscribe|abmeld|abbestell|austragen|opt-?out|optout|remove-?me|list-manage\.com\/unsubscribe/i;

export interface LinkReport {
	/** Unique http(s) links found in the body. */
	total: number;
	/** Links actually requested (unsubscribe links and those over the limit are skipped). */
	checked: number;
	/** Hosts of links that are clearly broken (404/410, NXDOMAIN, refused). Hosts only: no paths are stored. */
	dead: { host: string; reason: string }[];
	/** Hosts of URL shorteners found. */
	shorteners: string[];
	/** True if the body contains an unsubscribe-looking link. */
	hasUnsubscribeLink: boolean;
}

/** Extracts http(s) links from HTML (href) and plain text, deduplicated, in order of appearance. */
export function extractLinks(html: string | undefined, text: string | undefined): string[] {
	const found: string[] = [];
	const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#x2F;/gi, '/').replace(/&#47;/g, '/');
	for (const m of (html ?? '').matchAll(/href\s*=\s*["']([^"']+)["']/gi)) found.push(decode(m[1].trim()));
	for (const m of (text ?? '').matchAll(/https?:\/\/[^\s<>"')\]]+/gi)) found.push(m[0].replace(/[.,;:!?]+$/, ''));
	const seen = new Set<string>();
	return found.filter((u) => {
		if (!/^https?:\/\//i.test(u) || seen.has(u)) return false;
		seen.add(u);
		return true;
	});
}

function hostOf(url: string): string | null {
	try {
		return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
	} catch {
		return null;
	}
}

export function isShortener(url: string): boolean {
	const host = hostOf(url);
	return !!host && SHORTENERS.includes(host);
}

/** True only for globally routable unicast addresses. */
export function isPublicIp(ip: string): boolean {
	const v = ip.replace(/^::ffff:/i, '');
	if (isIP(v) === 4) {
		const [a, b, c] = v.split('.').map(Number);
		if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
		if (a === 100 && b >= 64 && b <= 127) return false;
		if (a === 169 && b === 254) return false;
		if (a === 172 && b >= 16 && b <= 31) return false;
		if (a === 192 && b === 168) return false;
		if (a === 192 && b === 0 && (c === 0 || c === 2)) return false;
		if (a === 198 && (b === 18 || b === 19)) return false;
		if (a === 198 && b === 51 && c === 100) return false;
		if (a === 203 && b === 0 && c === 113) return false;
		return true;
	}
	if (isIP(v) === 6) {
		const l = v.toLowerCase();
		if (l === '::' || l === '::1') return false;
		if (/^(fc|fd|fe8|fe9|fea|feb|ff)/.test(l)) return false;
		if (l.startsWith('2001:db8') || l.startsWith('64:ff9b')) return false;
		return true;
	}
	return false;
}

type Probe = { status: number; location?: string } | { error: 'nxdomain' | 'refused' | 'blocked' | 'timeout' | 'other' };

/** Resolves a hostname to one public address via our resolver, or null if none / private. */
async function resolvePublic(host: string, resolve: DnsResolver): Promise<{ address: string; family: 4 | 6 } | 'nxdomain' | 'blocked'> {
	if (isIP(host)) return isPublicIp(host) ? { address: host, family: isIP(host) as 4 | 6 } : 'blocked';
	let nx = 0;
	for (const [rr, family] of [['A', 4], ['AAAA', 6]] as const) {
		try {
			const addrs: string[] = await resolve(host, rr);
			if (addrs.length === 0) continue;
			// Any private answer makes the whole host suspicious (DNS rebinding tricks).
			if (!addrs.every(isPublicIp)) return 'blocked';
			return { address: addrs[0], family };
		} catch (err) {
			const code = (err as { code?: string }).code;
			if (code === 'ENOTFOUND' || code === 'ENODATA') nx++;
		}
	}
	return nx === 2 ? 'nxdomain' : 'blocked';
}

/** One request with a pinned, pre-validated IP. HEAD first; servers that refuse HEAD get a GET (body is not read). */
function request(url: URL, addr: { address: string; family: 4 | 6 }, method: 'HEAD' | 'GET', timeoutMs: number): Promise<Probe> {
	return new Promise((resolveP) => {
		const lib = url.protocol === 'https:' ? https : http;
		const req = lib.request(
			{
				protocol: url.protocol,
				hostname: url.hostname,
				port: url.port ? Number(url.port) : undefined,
				path: `${url.pathname}${url.search}`,
				method,
				timeout: timeoutMs,
				headers: { 'User-Agent': 'e-mail-check.de Linkpruefung (+https://e-mail-check.de)', Accept: '*/*' },
				// Pin the connection to the address we validated.
				lookup: ((_host: string, opts: { all?: boolean }, cb: (...args: unknown[]) => void) =>
					opts?.all ? cb(null, [{ address: addr.address, family: addr.family }]) : cb(null, addr.address, addr.family)) as unknown as http.RequestOptions['lookup'],
			} satisfies http.RequestOptions,
			(res) => {
				res.resume();
				res.destroy();
				resolveP({ status: res.statusCode ?? 0, location: res.headers.location });
			},
		);
		req.on('timeout', () => {
			req.destroy();
			resolveP({ error: 'timeout' });
		});
		req.on('error', (err: NodeJS.ErrnoException) => resolveP({ error: err.code === 'ECONNREFUSED' ? 'refused' : 'other' }));
		req.end();
	});
}

/** Follows up to 5 redirects, validating every hop. */
export async function probeUrl(raw: string, resolve: DnsResolver, timeoutMs = 4000): Promise<Probe> {
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		return { error: 'other' };
	}
	for (let hop = 0; hop < 6; hop++) {
		if (!['http:', 'https:'].includes(url.protocol)) return { error: 'blocked' };
		if (url.port && !['80', '443'].includes(url.port)) return { error: 'blocked' };
		if (url.username || url.password) return { error: 'blocked' };
		const addr = await resolvePublic(url.hostname.replace(/^\[|\]$/g, ''), resolve);
		if (addr === 'nxdomain' || addr === 'blocked') return { error: addr };
		let res = await request(url, addr, 'HEAD', timeoutMs);
		if ('status' in res && (res.status === 405 || res.status === 501)) res = await request(url, addr, 'GET', timeoutMs);
		if ('status' in res && res.status >= 300 && res.status < 400 && res.location) {
			try {
				url = new URL(res.location, url);
				continue;
			} catch {
				return { error: 'other' };
			}
		}
		return res;
	}
	return { error: 'other' };
}

/** Only unambiguous failures count as dead. 401/403/429/5xx can be bot protection or a hiccup. */
function deadReason(p: Probe): string | null {
	if ('error' in p) return p.error === 'nxdomain' ? 'Domain existiert nicht' : p.error === 'refused' ? 'Server lehnt ab' : null;
	if (p.status === 404) return 'Seite nicht gefunden (404)';
	if (p.status === 410) return 'Seite gelöscht (410)';
	return null;
}

export interface LinkCheckOptions {
	resolve: DnsResolver;
	maxLinks?: number;
	concurrency?: number;
	timeoutMs?: number;
	/** Injectable for tests. */
	probe?: (url: string) => Promise<Probe>;
}

export async function checkLinks(links: string[], opts: LinkCheckOptions): Promise<LinkReport> {
	const maxLinks = opts.maxLinks ?? 10;
	const probe = opts.probe ?? ((u: string) => probeUrl(u, opts.resolve, opts.timeoutMs));
	const hasUnsubscribeLink = links.some((u) => UNSUBSCRIBE.test(u));
	const shorteners = [...new Set(links.filter(isShortener).map((u) => hostOf(u)!))];
	const toCheck = links.filter((u) => !UNSUBSCRIBE.test(u)).slice(0, maxLinks);

	const dead = new Map<string, string>();
	let i = 0;
	const worker = async () => {
		while (i < toCheck.length) {
			const url = toCheck[i++];
			const reason = deadReason(await probe(url));
			const host = hostOf(url);
			if (reason && host && !dead.has(host)) dead.set(host, reason);
		}
	};
	await Promise.all(Array.from({ length: Math.min(opts.concurrency ?? 5, toCheck.length) }, worker));
	return { total: links.length, checked: toCheck.length, dead: [...dead].map(([host, reason]) => ({ host, reason })), shorteners, hasUnsubscribeLink };
}
