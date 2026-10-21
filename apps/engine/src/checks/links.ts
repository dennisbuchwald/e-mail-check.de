// Links in the message body: counted and checked for URL shorteners only. Links are NEVER requested
// (no HEAD, no GET): that could trigger unsubscribe or tracking links. Link domains are checked
// against URI blocklists by rspamd (Spamhaus DBL, SURBL, URIBL), which only receives the domain.

export const SHORTENERS = [
	'bit.ly', 'bitly.com', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly', 'rebrand.ly', 'cutt.ly',
	'shorturl.at', 'tiny.cc', 'rb.gy', 'bl.ink', 't.ly', 's.id', 'lnkd.in', 'shorte.st', 'adf.ly', 'v.gd', 'tiny.one',
	'short.io', 'soo.gd', 'clck.ru', 'qr.ae', 'urlz.fr', 'kurzelinks.de', 'kurzlink.de', 'gg.gg',
];

const UNSUBSCRIBE = /unsubscribe|abmeld|abbestell|austragen|opt-?out|optout|remove-?me|list-manage\.com\/unsubscribe/i;

export interface LinkSummary {
	/** Unique http(s) links found in the body. */
	total: number;
	/** Distinct link domains (count only, the domains are not stored). */
	domains: number;
	/** Hosts of URL shorteners found (public shortener services). */
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

/** Counts links and finds URL shorteners. Purely textual: nothing is requested. */
export function summarizeLinks(links: string[]): LinkSummary {
	const hosts = new Set(links.map(hostOf).filter((h): h is string => !!h));
	return {
		total: links.length,
		domains: hosts.size,
		shorteners: [...new Set(links.filter(isShortener).map((u) => hostOf(u)!))],
		hasUnsubscribeLink: links.some((u) => UNSUBSCRIBE.test(u)),
	};
}
