// "Das solltest du tun": every hint or problem of a result as one concrete step, with the finished DNS record
// to copy where one exists, the matching guide of the user's provider and, for DNS records, a live re-check.
import type { Finding, MailResult, Providers } from './types.ts';

/** What kind of problem a step is about (also the utm_content of the dbw media link). */
export type TodoCheck = 'spf' | 'absender' | 'dkim' | 'dmarc' | 'sperrliste' | 'rdns' | 'tls' | 'spam' | 'inhalt';

export interface TodoRecord {
	type: 'TXT';
	host: string;
	value: string;
	/** Part of the value the user must replace (shown marked). */
	placeholder?: string;
}

export interface TodoRecheck {
	kind: 'spf' | 'dmarc' | 'dkim';
	domain: string;
	selector?: string;
	/** SPF: this mechanism must be in the record now. */
	expect?: string;
	/** DMARC: one of these policies must be set now. */
	policies?: string[];
}

export interface Todo {
	check: TodoCheck;
	/** Station index of the scene (0 Absender … 5 Posteingang). */
	station: number;
	status: 'warn' | 'bad';
	title: string;
	why: string;
	/** Points this step brings back. */
	gain: number;
	record?: TodoRecord;
	guide?: { href: string; label: string };
	links?: { href: string; label: string }[];
	recheck?: TodoRecheck;
}

type Raw = Record<string, any>;
const raw = (f: Finding | undefined): Raw => (f?.raw ?? {}) as Raw;
const points = (f: Finding) => Math.round(f.deductions.reduce((s, d) => s + d.points, 0) * 10) / 10;

/** SPF building blocks of senders we recognise by their server name. */
const SPF_INCLUDE: [RegExp, string][] = [
	[/\.google(mail)?\.com$/, 'include:_spf.google.com'],
	[/\.outlook\.com$|\.office365\.com$/, 'include:spf.protection.outlook.com'],
	[/\.amazonses\.com$/, 'include:amazonses.com'],
	[/\.mcsv\.net$|\.mcdlv\.net$|\.rsgsv\.net$/, 'include:servers.mcsv.net'],
	[/\.sendinblue\.com$|\.brevo\.com$/, 'include:spf.brevo.com'],
	[/\.sendgrid\.net$/, 'include:sendgrid.net'],
	[/\.mailgun\.(net|org)$/, 'include:mailgun.org'],
	[/\.mailjet\.com$/, 'include:spf.mailjet.com'],
	[/\.mtasv\.net$/, 'include:spf.mtasv.net'],
	[/\.(kundenserver|ionos)\.(de|com)$/, 'include:_spf-eu.ionos.com'],
	[/\.icloud\.com$|\.me\.com$/, 'include:icloud.com'],
];

/** The mechanism that allows the server that sent this mail: a provider include, else its IP. */
function senderMechanism(rep: Raw): string | null {
	const host = String((rep.ptrMatches ? rep.ptr : rep.heloMatches ? rep.helo : '') ?? '').toLowerCase();
	for (const [re, inc] of SPF_INCLUDE) if (re.test(host)) return inc;
	const ip = String(rep.ip ?? '').replace(/^::ffff:/i, '');
	if (!ip) return null;
	return ip.includes(':') ? `ip6:${ip}` : `ip4:${ip}`;
}

/** The existing SPF record with the mechanism inserted before its "all" (or a new one). */
export function spfWith(record: string | null | undefined, mech: string): string {
	if (!record) return `v=spf1 ${mech} ~all`;
	const parts = record.trim().split(/\s+/);
	if (parts.includes(mech)) return record.trim();
	const all = parts.findIndex((p) => /^[~?+-]?all$/i.test(p) || /^redirect=/i.test(p));
	if (all < 0) return [...parts, mech, '~all'].join(' ');
	return [...parts.slice(0, all), mech, ...parts.slice(all)].join(' ');
}

/** The DMARC record with a stricter policy; keeps the rest of an existing record. */
export function dmarcStricter(record: string | null | undefined, domain: string): { value: string; placeholder?: string } {
	const placeholder = `dmarc@${domain}`;
	if (!record) return { value: `v=DMARC1; p=quarantine; rua=mailto:${placeholder}`, placeholder };
	let value = /;\s*p=\w+/i.test(record) ? record.replace(/(;\s*p=)\w+/i, '$1quarantine') : `${record.replace(/;?\s*$/, '')}; p=quarantine`;
	if (!/rua=/i.test(value)) return { value: `${value.replace(/;?\s*$/, '')}; rua=mailto:${placeholder}`, placeholder };
	return { value };
}

/** "So geht's bei IONOS ›" to our guide, or the general article when we do not know the provider. */
export function guideFor(topic: 'spf' | 'dkim' | 'dmarc', providers: Providers | undefined): { href: string; label: string } {
	// DKIM is switched on where the mail is sent from; SPF and DMARC are entered where the DNS is.
	const p = topic === 'dkim' && providers?.mail?.slug ? providers.mail : providers?.dns;
	if (p?.slug) return { href: p.slug === 'hetzner' ? '/anleitung/hetzner/spf-dkim-dmarc' : `/anleitung/${p.slug}/${topic}`, label: `So geht's bei ${p.name} ›` };
	return { href: `/wissen/${topic}`, label: 'Allgemeine Anleitung ›' };
}

const STATION: Record<string, number> = { spf: 0, sender: 0, dkim: 1, dmarc: 2, reputation: 3, transport: 4, content: 5 };

function todoOf(f: Finding, r: MailResult): Todo | null {
	if (f.status !== 'warn' && f.status !== 'bad') return null;
	const base = { station: STATION[f.id] ?? 0, status: f.status, gain: points(f) };
	const domain = r.fromDomain ?? 'deine-domain.de';
	const rep = raw(r.findings.find((x) => x.id === 'reputation'));
	const x = raw(f);
	const temp = f.deductions.some((d) => /temperror/i.test(d.reason));
	if (temp) {
		return { ...base, check: (f.id === 'dkim' || f.id === 'dmarc' ? f.id : 'spf') as TodoCheck, title: 'Später noch einmal testen', why: 'Der DNS-Server hat gerade nicht rechtzeitig geantwortet. Das ist keine Einstellung von dir, meist ist es nach ein paar Minuten vorbei.' };
	}
	switch (f.id) {
		case 'spf': {
			const mech = senderMechanism(rep);
			const recheck = { kind: 'spf' as const, domain: x.domain ?? domain };
			if (x.result === 'permerror') {
				return { ...base, check: 'spf', title: 'Absender-Eintrag reparieren', why: 'Dein SPF-Eintrag ist fehlerhaft, oft gibt es zwei Einträge oder zu viele Verweise. Dann ignorieren Empfänger ihn ganz. Fass alles in einem Eintrag zusammen.', guide: guideFor('spf', r.providers), recheck };
			}
			const value = mech ? spfWith(x.result === 'none' ? null : x.record, mech) : null;
			return {
				...base,
				check: 'spf',
				title: x.result === 'none' ? 'Absender-Eintrag anlegen' : 'Absender-Eintrag ergänzen',
				why: x.result === 'none' ? `Für ${domain} steht nirgends, welche Server Mails für dich senden dürfen. Ein SPF-Eintrag schließt diese Lücke.` : 'Der Server, der diese Mail verschickt hat, fehlt in deinem SPF-Eintrag. Hier ist dein Eintrag mit dem fehlenden Baustein.',
				...(value ? { record: { type: 'TXT' as const, host: '@', value } } : {}),
				guide: guideFor('spf', r.providers),
				recheck: { ...recheck, ...(mech ? { expect: mech } : {}) },
			};
		}
		case 'sender':
			return { ...base, check: 'absender', title: 'Mit eigener Domain versenden', why: 'Du schickst von einer Freemail-Adresse. Für Firmenmails wirkt eine Adresse mit deiner eigenen Domain vertrauenswürdiger und lässt sich selbst absichern.', links: [{ href: '/wissen/spf-dkim-dmarc', label: 'Was du dafür brauchst ›' }] };
		case 'dkim': {
			const sigs = (x.signatures ?? []) as Raw[];
			const own = sigs.find((s) => String(s.domain ?? '').toLowerCase() === domain.toLowerCase());
			const title = !sigs.length ? 'Unterschrift (DKIM) einschalten' : sigs.every((s) => s.result !== 'pass') ? 'Unterschrift reparieren' : 'Unterschrift für deine Domain einrichten';
			const why = !sigs.length
				? 'Deine Mail ist nicht digital unterschrieben. Den Schlüssel erzeugt dein Mail-Anbieter, du schaltest ihn dort ein und trägst ihn in die DNS-Einstellungen ein.'
				: sigs.every((s) => s.result !== 'pass')
					? 'Die Unterschrift deiner Mail passt nicht, meist fehlt der Schlüssel im DNS oder er wurde geändert. Prüf ihn bei deinem Mail-Anbieter.'
					: 'Deine Mail ist unterschrieben, aber von deinem Versanddienst statt von deiner Domain. Richte dort die Unterschrift für deine eigene Domain ein.';
			return { ...base, check: 'dkim', title, why, guide: guideFor('dkim', r.providers), recheck: { kind: 'dkim', domain, ...(own?.selector ? { selector: String(own.selector) } : {}) } };
		}
		case 'dmarc': {
			if (x.result === undefined) {
				return { ...base, check: 'dmarc', title: 'Gültige Absenderadresse verwenden', why: 'Die Absenderadresse (From) deiner Mail fehlt oder ist fehlerhaft. Stell im Mail-Programm oder Versanddienst eine Adresse mit deiner eigenen Domain ein.' };
			}
			if (x.result === 'fail') {
				return { ...base, check: 'dmarc', title: 'SPF oder DKIM passend machen', why: 'Deine Schutzregel ist aktiv, aber diese Mail erfüllt sie nicht: weder SPF noch DKIM passen zu deiner Absenderadresse. Behebe zuerst die Punkte bei Absender und Unterschrift.', guide: guideFor('dmarc', r.providers) };
			}
			const { value, placeholder } = dmarcStricter(x.record, domain);
			const create = !x.record;
			return {
				...base,
				check: 'dmarc',
				title: create ? 'Schutzregel anlegen' : 'Schutzregel verschärfen',
				why: create ? `Für ${domain} gibt es keine Regel, was mit gefälschten Mails in deinem Namen passieren soll. Gmail und Outlook erwarten sie inzwischen.` : 'Deine Schutzregel steht noch im Beobachtungsmodus (p=none): Gefälschte Mails kommen damit weiter an. Mit p=quarantine landen sie im Spam.',
				record: { type: 'TXT', host: '_dmarc', value, ...(placeholder ? { placeholder } : {}) },
				guide: guideFor('dmarc', r.providers),
				recheck: { kind: 'dmarc', domain, policies: create ? ['none', 'quarantine', 'reject'] : ['quarantine', 'reject'] },
			};
		}
		case 'reputation': {
			const listed = ((x.lists ?? []) as Raw[]).filter((l) => l.listed);
			if (listed.length && listed.every((l) => l.pbl)) {
				return { ...base, check: 'sperrliste', title: 'Über den Postausgangsserver senden', why: 'Die Mail kam direkt von einem normalen Internetanschluss. Große Anbieter nehmen das nicht an. Verschick über den SMTP-Server deines Mail-Anbieters (mit Anmeldung), das betrifft oft Kontaktformulare und Scanner.' };
			}
			if (listed.length) {
				return {
					...base,
					check: 'sperrliste',
					title: f.status === 'bad' ? 'Von der Sperrliste runter' : 'Kleine Sperrliste prüfen',
					why: f.status === 'bad' ? `Der sendende Server steht auf ${listed.map((l) => l.list).join(', ')}. Bei einem Mail-Anbieter: Support kontaktieren. Bei eigenem Server: Ursache abstellen und austragen lassen.` : `Der Server steht auf ${listed.map((l) => l.list).join(', ')}. Große Anbieter richten sich kaum danach. Bei eigenem Server lohnt sich das Austragen trotzdem.`,
					links: listed.map((l) => ({ href: String(l.delistUrl), label: `Bei ${l.list} prüfen ›` })),
				};
			}
			return { ...base, check: 'rdns', title: x.ptr ? 'Server-Namen korrigieren lassen' : 'Rückwärts-Eintrag setzen lassen', why: x.ptr ? `Der Server heißt laut rDNS „${x.ptr}“, aber der Name zeigt nicht zurück auf ${x.ip}. Das korrigiert der Betreiber des Servers.` : `Der Server ${x.ip ?? ''} hat keinen Rückwärts-Eintrag (rDNS). Den setzt der Betreiber des Servers, frag bei deinem Hoster nach.` };
		}
		case 'transport':
			return { ...base, check: 'tls', title: x.tls?.used ? 'Verschlüsselung aktualisieren lassen' : 'Verschlüsselung einschalten lassen', why: x.tls?.used ? `Deine Mail kam mit TLS ${x.tls.level ?? ''} an, das gilt als veraltet. Der Betreiber deines Mailservers sollte TLS 1.2 oder 1.3 aktivieren.` : 'Deine Mail kam unverschlüsselt bei uns an. Unterwegs hätte jemand mitlesen können. Das stellt der Betreiber deines Mailservers ein.' };
		case 'content':
			return {
				...base,
				check: f.status === 'bad' ? 'spam' : 'inhalt',
				title: f.status === 'bad' ? 'Inhalt entschärfen' : 'Inhalt verbessern',
				why: f.status === 'bad' ? 'Der Spamfilter stuft den Inhalt als Spam ein. Welche Regeln anschlagen, steht im Detail zur Station Posteingang.' : 'Ein paar Punkte im Inhalt machen Spamfilter misstrauisch. Die Liste steht im Detail zur Station Posteingang.',
				links: [{ href: '/wissen/mails-landen-im-spam', label: 'Warum Mails im Spam landen ›' }],
			};
	}
	return null;
}

/** All steps, problems before hints, then by points. */
export function todosOf(r: MailResult): Todo[] {
	return r.findings
		.map((f) => todoOf(f, r))
		.filter((t): t is Todo => !!t)
		.sort((a, b) => (a.status === b.status ? b.gain - a.gain : a.status === 'bad' ? -1 : 1));
}

/** Optional tips when everything is green. */
export function proTipsOf(r: MailResult): { title: string; text: string; record?: TodoRecord }[] {
	const dmarc = raw(r.findings.find((f) => f.id === 'dmarc'));
	const domain = r.fromDomain ?? 'deine-domain.de';
	const tips: { title: string; text: string; record?: TodoRecord }[] = [];
	if (dmarc.policy === 'quarantine' && dmarc.record) {
		tips.push({ title: 'Schutzregel auf reject stellen', text: 'Gefälschte Mails werden dann nicht nur aussortiert, sondern abgelehnt. Mach das erst, wenn alle Dienste, die für dich senden, sauber unterschreiben.', record: { type: 'TXT', host: '_dmarc', value: String(dmarc.record).replace(/(;\s*p=)\w+/i, '$1reject') } });
	}
	if (dmarc.policy === 'quarantine' || dmarc.policy === 'reject') {
		tips.push({ title: 'Dein Logo im Postfach (BIMI)', text: `Mit einer aktiven Schutzregel kann ${domain} sein Logo neben deinen Mails zeigen lassen, bei Gmail und Apple Mail. Dafür brauchst du ein SVG-Logo und meist ein Marken-Zertifikat (VMC).` });
	}
	return tips;
}
