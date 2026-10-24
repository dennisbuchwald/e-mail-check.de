// Bonus checks without points: how well mail *to* the sender domain is protected. DNSSEC (signed zone),
// DANE (TLSA records for the mail servers), MTA-STS and TLS-RPT (DNS records only: the MTA-STS policy file
// is never fetched, like links in the mail). None of this changes whether the tested mail arrives.
import type { DnsCheckResult, DomainSecurity, Finding } from '@emc/shared';
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
	const [dnssec, hosts, mtaSts, tlsRpt, bimiRecord] = await Promise.all([signed, mxHosts, txt(`_mta-sts.${domain}`, /^v=STSv1\b/i), txt(`_smtp._tls.${domain}`, /^v=TLSRPTv1\b/i), txt(`default._bimi.${domain}`, /^v=BIMI1\b/i)]);
	// BIMI: l= is the logo, a= the mark certificate. An empty l= means "declined" (e.g. iCloud).
	const bimiTag = (k: string) => new RegExp(`(?:^|;)\\s*${k}=([^;]*)`, 'i').exec(bimiRecord ?? '')?.[1]?.trim() ?? '';
	const bimi = { record: bimiRecord, logo: !!bimiTag('l'), vmc: !!bimiTag('a') };
	// DANE counts only with a validated (signed) TLSA answer.
	const mx = await Promise.all(
		hosts.map((host) =>
			lookup(`_25._tcp.${host}`, 'TLSA').then(
				(a) => ({ host, tlsa: a.rcode === 0 ? a.count : 0, dane: a.rcode === 0 && a.count > 0 && a.ad }),
				() => ({ host, tlsa: 0, dane: false }),
			),
		),
	);
	return { domain, dnssec, mx, mtaSts, tlsRpt, bimi };
}

/** The four bonus checks as findings for the /dnssec-check page. No deductions: missing is a hint, never a problem. */
export function securityFindings(s: DomainSecurity): Finding[] {
	const f = (id: Finding['id'], status: Finding['status'], title: string, tech: string, text: string, raw: Record<string, unknown>, extra: Partial<Finding> = {}): Finding => ({ id, status, title, tech, text, deductions: [], raw, ...extra });
	const hosts = s.mx.map((m) => m.host).join(', ');
	const dane = s.mx.filter((m) => m.dane);
	const rua = `tls-berichte@${s.domain}`;
	return [
		s.dnssec === 'signed'
			? f('dnssec', 'ok', 'Domain ist signiert', 'DNSSEC', `Die DNS-Einträge von ${s.domain} sind digital signiert. Unterwegs kann sie niemand fälschen.`, { dnssec: 'signed' })
			: s.dnssec === 'unsigned'
				? f('dnssec', 'warn', 'Domain ist nicht signiert', 'DNSSEC', `Die DNS-Einträge von ${s.domain} haben keine Signatur. Bei vielen Anbietern ist DNSSEC ein Schalter in den Domain-Einstellungen. Erst damit wird DANE möglich.`, { dnssec: 'unsigned' })
				: f('dnssec', 'skip', 'DNSSEC nicht prüfbar', 'DNSSEC', 'Der Nameserver hat gerade nicht sauber geantwortet. Probier es gleich noch einmal.', { dnssec: null }),
		!s.mx.length
			? f('dane', 'skip', 'Keine Mailserver gefunden', 'DANE', `Für ${s.domain} gibt es keinen MX-Eintrag, also nichts, was DANE schützen könnte.`, { mx: [] })
			: dane.length === s.mx.length
				? f('dane', 'ok', 'DANE ist aktiv', 'DANE', `Alle Mailserver haben signierte TLSA-Einträge: ${hosts}. Andere Server wissen vorab, welches Zertifikat sie erwarten dürfen.`, { mx: s.mx })
				: dane.length
					? f('dane', 'warn', 'DANE nur teilweise', 'DANE', `Nur ${dane.map((m) => m.host).join(', ')} hat signierte TLSA-Einträge. Die anderen Mailserver sind ungeschützt.`, { mx: s.mx })
					: f('dane', 'warn', 'Kein DANE', 'DANE', `Deine Mailserver (${hosts}) haben keinen signierten TLSA-Eintrag. DANE richtet ein, wer die Mailserver betreibt. Bei gehosteter Mail (IONOS, Google, Microsoft) liegt das beim Anbieter.`, { mx: s.mx }),
		s.mtaSts
			? f('mta-sts', 'ok', 'Verschlüsselung angekündigt', 'MTA-STS', 'Es gibt einen MTA-STS-Eintrag. Ob die Regel-Datei unter mta-sts. dazu passt, prüfen wir nicht, wir rufen sie bewusst nicht ab.', { record: s.mtaSts })
			: f('mta-sts', 'warn', 'Kein MTA-STS', 'MTA-STS', `Mit MTA-STS sagt ${s.domain} anderen Mailservern: Mails an mich nur verschlüsselt. Gmail und Microsoft halten sich daran. Dafür braucht es einen DNS-Eintrag und eine kleine Textdatei unter mta-sts.${s.domain}.`, {}),
		s.tlsRpt
			? f('tls-rpt', 'ok', 'Berichte sind eingerichtet', 'TLS-RPT', 'Andere Mailserver schicken dir Berichte, ob die verschlüsselte Zustellung an dich klappt und wo sie scheitert.', { record: s.tlsRpt })
			: f('tls-rpt', 'warn', 'Keine Berichte über Verschlüsselung', 'TLS-RPT', `Ein einziger Eintrag, und du bekommst Berichte, ob Mails an dich verschlüsselt ankommen. Ersetze ${rua} durch eine Adresse, die es gibt.`, {}, { suggestion: { type: 'TXT', host: '_smtp._tls', value: `v=TLSRPTv1; rua=mailto:${rua}` } }),
	];
}

export async function securityCheck(domain: string, resolve: DnsResolver, lookup: SecLookup): Promise<DnsCheckResult> {
	const findings = securityFindings(await checkSecurity(domain, resolve, lookup));
	const warn = findings.filter((x) => x.status === 'warn').length;
	const ok = findings.filter((x) => x.status === 'ok').length;
	return {
		domain,
		light: warn ? 'warn' : 'ok',
		headline: !warn ? 'Rundum abgesichert' : ok ? `${ok} von 4 Schutzstufen eingerichtet` : 'Noch keine Schutzstufe eingerichtet',
		findings,
		checkedAt: new Date().toISOString(),
	};
}
