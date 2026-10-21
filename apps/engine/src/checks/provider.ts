// Which provider hosts the DNS (name servers) and the mail (MX) of the sender domain, so the result can link
// straight to our guide ("So geht's bei IONOS"). Only the domain's public records are read, nothing is stored
// beyond the provider names.
import type { ProviderInfo, Providers } from '@emc/shared';
import type { DnsResolver } from '../dns.ts';

type Rule = [pattern: RegExp, info: ProviderInfo];

/** Name servers → where the DNS records are entered. `slug` = a guide exists under /anleitung/<slug>/. */
const DNS_RULES: Rule[] = [
	[/\.ui-dns\.(de|com|org|biz)$/, { slug: 'ionos', name: 'IONOS' }],
	[/\.rzone\.de$/, { slug: 'strato', name: 'STRATO' }],
	[/\.kasserver\.com$/, { slug: 'all-inkl', name: 'ALL-INKL' }],
	[/(\.ns\.hetzner\.(com|de)|\.your-server\.de|\.second-ns\.(com|de))$/, { slug: 'hetzner', name: 'Hetzner' }],
	[/\.(domaincontrol)\.com$/, { slug: null, name: 'GoDaddy' }],
	[/\.ns\.cloudflare\.com$/, { slug: null, name: 'Cloudflare' }],
	[/\.udag\.(de|net|org)$/, { slug: null, name: 'united-domains' }],
	[/\.netcup\.net$/, { slug: null, name: 'netcup' }],
	[/\.googledomains\.com$|\.google\.com$/, { slug: null, name: 'Google' }],
	[/\.(azure-dns)\.(com|net|org|info)$/, { slug: null, name: 'Microsoft Azure' }],
];

/** MX → who delivers the mail (decides the DKIM guide). */
const MAIL_RULES: Rule[] = [
	[/(^|\.)(aspmx\.l\.google\.com|google\.com|googlemail\.com)$/, { slug: 'google-workspace', name: 'Google Workspace' }],
	[/\.mail\.protection\.outlook\.com$/, { slug: 'microsoft-365', name: 'Microsoft 365' }],
	[/\.(ionos|kundenserver)\.(de|com)$/, { slug: 'ionos', name: 'IONOS' }],
	[/\.rzone\.de$|\.strato\.de$/, { slug: 'strato', name: 'STRATO' }],
	[/\.kasserver\.com$/, { slug: 'all-inkl', name: 'ALL-INKL' }],
	[/\.your-server\.de$/, { slug: 'hetzner', name: 'Hetzner' }],
	[/\.mail\.icloud\.com$/, { slug: null, name: 'iCloud' }],
	[/\.mx\.cloudflare\.net$/, { slug: null, name: 'Cloudflare' }],
];

const match = (hosts: string[], rules: Rule[]): ProviderInfo | undefined => {
	for (const h of hosts.map((x) => x.toLowerCase().replace(/\.$/, ''))) for (const [re, info] of rules) if (re.test(h)) return info;
	return undefined;
};

/** NS of the domain, or of its parent for a subdomain like mail.firma.de. */
async function nameServers(domain: string, resolve: DnsResolver): Promise<string[]> {
	let d = domain;
	for (let i = 0; i < 3 && d.includes('.'); i++) {
		try {
			const ns: string[] = await resolve(d, 'NS');
			if (ns.length) return ns;
		} catch {
			/* try the parent */
		}
		d = d.slice(d.indexOf('.') + 1);
	}
	return [];
}

export async function detectProviders(domain: string | null, resolve: DnsResolver): Promise<Providers> {
	if (!domain) return {};
	const [ns, mx] = await Promise.all([
		nameServers(domain, resolve),
		(resolve(domain, 'MX') as Promise<{ exchange: string }[]>).then((r) => r.map((m) => m.exchange), () => [] as string[]),
	]);
	const out: Providers = {};
	const dns = match(ns, DNS_RULES);
	const mail = match(mx, MAIL_RULES);
	if (dns) out.dns = dns;
	if (mail) out.mail = mail;
	return out;
}
