// Bonus checks without points: how well mail *to* the sender domain is protected. DNSSEC (signed zone),
// DANE (TLSA records for the mail servers), MTA-STS and TLS-RPT (DNS records only: the MTA-STS policy file
// is never fetched, like links in the mail). None of this changes whether the tested mail arrives.
import type { DomainSecurity } from '@emc/shared';
import { resolveTxt, type DnsResolver } from '../dns.ts';
import type { SecLookup } from '../dnssec.ts';

const MAX_MX = 3;

export async function checkSecurity(domain: string, resolve: DnsResolver, lookup: SecLookup): Promise<DomainSecurity> {
	const signed = lookup(domain, 'MX').then(
		(a) => (a.rcode === 0 || a.rcode === 3 ? (a.ad ? 'signed' : 'unsigned') : null),
		() => null,
	);
	const mxHosts = (resolve(domain, 'MX') as Promise<{ exchange: string; priority: number }[]>).then(
		(rows) => rows.sort((a, b) => a.priority - b.priority).map((r) => r.exchange.toLowerCase().replace(/\.$/, '')).filter(Boolean).slice(0, MAX_MX),
		() => [] as string[],
	);
	const txt = (name: string, prefix: RegExp) => resolveTxt(resolve, name).then((rows) => rows.find((r) => prefix.test(r)) ?? null, () => null);
	const [dnssec, hosts, mtaSts, tlsRpt] = await Promise.all([signed, mxHosts, txt(`_mta-sts.${domain}`, /^v=STSv1\b/i), txt(`_smtp._tls.${domain}`, /^v=TLSRPTv1\b/i)]);
	// DANE counts only with a validated (signed) TLSA answer.
	const mx = await Promise.all(
		hosts.map((host) =>
			lookup(`_25._tcp.${host}`, 'TLSA').then(
				(a) => ({ host, tlsa: a.rcode === 0 ? a.count : 0, dane: a.rcode === 0 && a.count > 0 && a.ad }),
				() => ({ host, tlsa: 0, dane: false }),
			),
		),
	);
	return { domain, dnssec, mx, mtaSts, tlsRpt };
}
