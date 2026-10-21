// DNS quick check without a test mail: SPF, DMARC and (if findable) DKIM for a domain.
import { domainToASCII } from 'node:url';
import getDmarcRecord from 'mailauth/lib/dmarc/get-dmarc-record';
import type { DnsCheckResult, Finding } from '@emc/shared';
import { resolveTxt, type DnsResolver } from './dns.ts';

/** Accepts "Example.de", "https://www.example.de/x", "max@example.de". Returns null if invalid. */
export function normalizeDomain(input: string): string | null {
	let s = input.trim().toLowerCase();
	if (s.includes('@')) s = s.slice(s.lastIndexOf('@') + 1);
	s = s.replace(/^[a-z]+:\/\//, '').split(/[/?#:]/)[0].replace(/\.$/, '');
	const ascii = domainToASCII(s);
	if (!ascii || ascii.length > 253) return null;
	const label = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;
	const parts = ascii.split('.');
	if (parts.length < 2 || !parts.every((p) => label.test(p))) return null;
	return ascii;
}

/** Common DKIM selectors, probed when the user does not know theirs. */
export const COMMON_SELECTORS = ['default', 'dkim', 'mail', 'selector1', 'selector2', 'google', 's1-ionos', 's2-ionos', 's42582890', 'strato-dkim-0002', 'strato-dkim-0003', 's1', 's2', 'k1', 'k2', 'key1', 'dkim1', 'smtp', 'sig1', 'mx'];

/** Known SPF includes → service name, so users see who may send for them. */
const KNOWN_SENDERS: [RegExp, string][] = [
	[/ionos|kundenserver\.de/, 'IONOS'],
	[/strato/, 'STRATO'],
	[/kasserver\.com|all-inkl/, 'ALL-INKL'],
	[/your-server\.de|hetzner/, 'Hetzner'],
	[/spf\.protection\.outlook\.com/, 'Microsoft 365'],
	[/_spf\.google\.com/, 'Google Workspace'],
	[/sendgrid\.net/, 'SendGrid'],
	[/mailgun\.org/, 'Mailgun'],
	[/sendinblue\.com|brevo\.com/, 'Brevo'],
	[/mcsv\.net|mandrillapp\.com/, 'Mailchimp'],
	[/amazonses\.com/, 'Amazon SES'],
	[/rapidmail/, 'rapidmail'],
	[/cleverreach/, 'CleverReach'],
	[/hubspot/, 'HubSpot'],
	[/zoho/, 'Zoho'],
	[/mailjet\.com/, 'Mailjet'],
	[/postmarkapp\.com|mtasv\.net/, 'Postmark'],
	[/klaviyo/, 'Klaviyo'],
];

export function spfSenders(record: string): string[] {
	const names = new Set<string>();
	for (const m of record.matchAll(/(?:include:|redirect=)(\S+)/g)) {
		const hit = KNOWN_SENDERS.find(([re]) => re.test(m[1].toLowerCase()));
		names.add(hit ? hit[1] : m[1]);
	}
	if (/\s[+]?(a|mx)(\s|:|\/|$)/.test(` ${record} `)) names.add('eigene Server (a/mx)');
	if (/ip[46]:/.test(record)) names.add('feste IP-Adressen');
	return [...names];
}

const LOOKUP_TERMS = /^[+\-~?]?(include:|a\b|mx\b|ptr\b|exists:)|^redirect=/;

/** Counts DNS-querying terms of an SPF record, following include/redirect (RFC 7208 4.6.4). */
export async function countSpfLookups(record: string, resolve: DnsResolver, depth = 0): Promise<number> {
	if (depth > 10) return 99;
	let count = 0;
	for (const term of record.split(/\s+/).slice(1)) {
		if (!LOOKUP_TERMS.test(term)) continue;
		count++;
		const target = /^[+\-~?]?include:(.+)$/.exec(term)?.[1] ?? /^redirect=(.+)$/.exec(term)?.[1];
		if (target && !target.includes('%{')) {
			const sub = (await resolveTxt(resolve, target)).filter((r) => /^v=spf1(\s|$)/i.test(r));
			if (sub.length === 1) count += await countSpfLookups(sub[0], resolve, depth + 1);
		}
		if (count > 10) break;
	}
	return count;
}

export async function spfDnsFinding(domain: string, resolve: DnsResolver): Promise<Finding> {
	const base = { id: 'spf' as const, tech: 'SPF', guide: 'spf' as const };
	const records = (await resolveTxt(resolve, domain)).filter((r) => /^v=spf1(\s|$)/i.test(r));
	if (records.length === 0) {
		return { ...base, status: 'bad', title: 'Absender-Eintrag fehlt', text: `${domain} sagt nicht, welche Server Mails für sie senden dürfen. Leg einen SPF-Eintrag an.`, deductions: [], raw: { records } };
	}
	if (records.length > 1) {
		return { ...base, status: 'bad', title: 'Zwei Absender-Einträge', text: `${domain} hat ${records.length} SPF-Einträge. Erlaubt ist genau einer, sonst ignorieren Empfänger alle. Fass sie zu einem zusammen.`, deductions: [], raw: { records } };
	}
	const rec = records[0];
	const lookups = await countSpfLookups(rec, resolve);
	const all = /\s([+\-~?]?)all(\s|$)/i.exec(` ${rec}`);
	const senders = spfSenders(rec);
	const raw = { record: rec, lookups, senders };
	if (lookups > 10) {
		return { ...base, status: 'bad', title: 'Absender-Eintrag zu lang', text: `Dein SPF-Eintrag braucht ${lookups} Nachfragen, erlaubt sind 10. Empfänger werten ihn deshalb als Fehler. Entferne Dienste, die du nicht mehr nutzt.`, deductions: [], raw };
	}
	if (all && (all[1] === '+' || all[1] === '')) {
		return { ...base, status: 'bad', title: 'Jeder darf senden', text: 'Dein SPF-Eintrag endet mit „+all“. Damit darf jeder Server der Welt in deinem Namen senden. Ersetze es durch „~all“ oder „-all“.', deductions: [], raw };
	}
	if (!all && !/redirect=/.test(rec)) {
		return { ...base, status: 'warn', title: 'Absender-Eintrag ohne Abschluss', text: 'Deinem SPF-Eintrag fehlt am Ende „~all“ oder „-all“. Empfänger wissen sonst nicht, was mit fremden Servern passieren soll.', deductions: [], raw };
	}
	if (all && all[1] === '?') {
		return { ...base, status: 'warn', title: 'Absender-Eintrag zu locker', text: 'Dein SPF-Eintrag endet mit „?all“ und legt sich damit nicht fest. Besser ist „~all“ oder „-all“.', deductions: [], raw };
	}
	return {
		...base,
		guide: undefined,
		status: 'ok',
		title: 'Absender-Eintrag vorhanden',
		text: `Dein SPF-Eintrag ist gültig.${senders.length ? ` Senden dürfen: ${senders.join(', ')}.` : ''} Er nutzt ${lookups} von 10 erlaubten Nachfragen${lookups >= 9 ? ', viel Luft ist nicht mehr' : ''}. Fehlt ein Dienst, der für dich Mails verschickt, landen dessen Mails im Spam.`,
		deductions: [],
		raw,
	};
}

export async function dmarcDnsFinding(domain: string, resolve: DnsResolver): Promise<Finding> {
	const base = { id: 'dmarc' as const, tech: 'DMARC', guide: 'dmarc' as const };
	const rec = (await getDmarcRecord(domain, resolve)) as false | { p?: string; rua?: string; rr?: string; recordDomain?: string };
	const suggestion = { type: 'TXT' as const, host: `_dmarc.${domain}`, value: `v=DMARC1; p=none; rua=mailto:dmarc@${domain}` };
	if (!rec) {
		return { ...base, status: 'bad', title: 'Schutzregel fehlt', text: `Für ${domain} gibt es keine Regel, was mit gefälschten Mails passieren soll. Gmail und Outlook erwarten sie inzwischen.`, deductions: [], suggestion, raw: {} };
	}
	const raw = { record: rec.rr, policy: rec.p, foundAt: rec.recordDomain };
	if (rec.p === 'none' || !rec.p) {
		return {
			...base,
			status: 'warn',
			title: 'Schutzregel im Testmodus',
			text: `Die Schutzregel steht nur auf Beobachten (p=none). Gefälschte Mails werden noch nicht aussortiert.${rec.rua ? '' : ' Außerdem fehlt eine Adresse für Berichte (rua), du erfährst also nichts über Fälschungen.'}`,
			deductions: [],
			raw,
		};
	}
	return { ...base, guide: undefined, status: 'ok', title: 'Schutzregel aktiv', text: `Gefälschte Mails im Namen von ${domain} werden ${rec.p === 'reject' ? 'abgelehnt' : 'aussortiert'}.`, deductions: [], raw };
}

export async function dkimDnsFinding(domain: string, resolve: DnsResolver, selector?: string): Promise<Finding> {
	const base = { id: 'dkim' as const, tech: 'DKIM', guide: 'dkim' as const };
	const selectors = selector ? [selector] : COMMON_SELECTORS;
	const found = (
		await Promise.all(
			selectors.map(async (s) => {
				const recs = (await resolveTxt(resolve, `${s}._domainkey.${domain}`).catch(() => [])).filter((r) => /p=/.test(r));
				return recs.length ? { selector: s, record: recs[0] } : null;
			}),
		)
	).filter((x) => x !== null);
	if (found.length > 0) {
		const revoked = found.every((f) => /p=\s*(;|$)/.test(f.record));
		return revoked
			? { ...base, status: 'bad', title: 'Schlüssel gesperrt', text: `Der Schlüssel unter „${found[0].selector}“ ist leer und damit gesperrt.`, deductions: [], raw: { found } }
			: { ...base, guide: undefined, status: 'ok', title: 'Schlüssel gefunden', text: `Wir haben einen DKIM-Schlüssel gefunden (Selektor: ${found.map((f) => f.selector).join(', ')}). Ob deine Mails wirklich damit unterschrieben werden, zeigt der Mail-Test.`, deductions: [], raw: { found } };
	}
	if (selector) {
		return { ...base, status: 'bad', title: 'Kein Schlüssel gefunden', text: `Unter ${selector}._domainkey.${domain} liegt kein DKIM-Schlüssel.`, deductions: [], raw: { selector } };
	}
	return {
		...base,
		status: 'warn',
		title: 'Unterschrift nicht auffindbar',
		text: 'Ohne den Namen des Schlüssels (Selektor) können wir DKIM nicht sicher finden. Das heißt nicht, dass es fehlt. Mach den Mail-Test, der findet es zuverlässig.',
		deductions: [],
		raw: { probed: selectors },
	};
}

export async function dnsCheck(domain: string, resolve: DnsResolver, selector?: string): Promise<DnsCheckResult> {
	const [spf, dkim, dmarc] = await Promise.all([spfDnsFinding(domain, resolve), dkimDnsFinding(domain, resolve, selector), dmarcDnsFinding(domain, resolve)]);
	const findings = [spf, dkim, dmarc];
	const bad = findings.filter((f) => f.status === 'bad').length;
	const warn = findings.filter((f) => f.status === 'warn').length;
	return {
		domain,
		light: bad ? 'bad' : warn ? 'warn' : 'ok',
		headline: bad ? (bad === 1 ? '1 Problem gefunden' : `${bad} Probleme gefunden`) : warn ? 'Fast alles passt' : 'Alles eingerichtet',
		findings,
		checkedAt: new Date().toISOString(),
	};
}
