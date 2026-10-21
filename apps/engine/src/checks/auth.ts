// SPF, DKIM and DMARC via mailauth, translated into plain-language findings.
import { authenticate } from 'mailauth';
import { POINTS, type Finding } from '@emc/shared';
import type { DnsResolver } from '../dns.ts';

export interface SmtpEnvelope {
	ip: string;
	helo: string;
	/** MAIL FROM; empty string for a null reverse-path (bounces). */
	sender: string;
}

export interface AuthFindings {
	spf: Finding;
	dkim: Finding;
	dmarc: Finding;
	fromDomain: string | null;
}

// mailauth results are loosely typed; we only read these fields.
interface SpfResult {
	domain?: string;
	rr?: string;
	status: { result: string; comment?: string };
	lookups?: { count: number; limit: number };
	warnings?: string[];
}
interface DkimSignature {
	signingDomain?: string;
	selector?: string;
	algo?: string;
	modulusLength?: number;
	status: { result: string; comment?: string; aligned?: string | false; testing?: boolean };
}
interface DmarcResult {
	domain?: string;
	policy?: string;
	p?: string;
	rr?: string;
	testMode?: boolean;
	alignment?: { spf?: { result?: string }; dkim?: { result?: string } };
	status: { result: string; header?: { from?: string } };
}

export async function checkAuth(message: Buffer, env: SmtpEnvelope, resolver: DnsResolver, mta: string): Promise<AuthFindings> {
	const res = await authenticate(message, {
		ip: env.ip,
		helo: env.helo,
		sender: env.sender,
		mta,
		resolver,
		disableArc: true,
		disableBimi: true,
	});
	const spfRes = res.spf as unknown as SpfResult | false;
	const dkimRes = res.dkim as unknown as { headerFrom?: string[]; results: DkimSignature[] };
	const dmarcRes = res.dmarc as unknown as DmarcResult | false;

	const fromAddr = dkimRes?.headerFrom?.[0] ?? '';
	const fromDomain = dmarcRes ? (dmarcRes.status.header?.from ?? domainOf(fromAddr)) : domainOf(fromAddr);

	return {
		spf: spfFinding(spfRes, env),
		dkim: dkimFinding(dkimRes?.results ?? [], fromDomain),
		dmarc: dmarcFinding(dmarcRes, fromDomain),
		fromDomain,
	};
}

function domainOf(addr: string): string | null {
	const at = addr.lastIndexOf('@');
	return at > 0 ? addr.slice(at + 1).toLowerCase() : null;
}

export function spfFinding(spf: SpfResult | false, env: SmtpEnvelope): Finding {
	const base = { id: 'spf' as const, tech: 'SPF', guide: 'spf' as const };
	const raw = {
		result: spf ? spf.status.result : 'none',
		domain: spf ? spf.domain : null,
		record: spf ? (spf.rr ?? null) : null,
		clientIp: env.ip,
		helo: env.helo,
		lookups: spf ? spf.lookups : null,
	};
	const domain = (spf && spf.domain) || 'deine Domain';
	const result = spf ? spf.status.result : 'none';
	switch (result) {
		case 'pass': {
			const near = spf && spf.lookups && spf.lookups.count >= 9;
			return {
				...base,
				guide: undefined,
				status: 'ok',
				title: 'Absender bestätigt',
				text: near
					? `${domain} erlaubt diesem Server, Mails zu senden. Achtung: Dein Eintrag nutzt ${spf.lookups!.count} von 10 erlaubten Verweisen. Ein weiterer Dienst würde ihn ungültig machen.`
					: `${domain} erlaubt diesem Server ausdrücklich, Mails in ihrem Namen zu senden.`,
				deductions: [],
				raw,
			};
		}
		case 'none':
			return {
				...base,
				status: 'bad',
				title: 'Absender nicht bestätigt',
				text: `${domain} sagt nicht, welche Server Mails für sie senden dürfen. Empfänger können echte und gefälschte Mails nicht unterscheiden.`,
				deductions: [{ reason: 'Kein SPF-Eintrag', points: POINTS.spf.none }],
				raw,
			};
		case 'softfail':
			return {
				...base,
				status: 'warn',
				title: 'Absender nur halb bestätigt',
				text: `Der Server, der deine Mail verschickt hat, fehlt im Eintrag von ${domain}. Empfänger werden misstrauisch. Meist fehlt ein Dienst, z. B. dein Newsletter-Tool.`,
				deductions: [{ reason: 'SPF softfail', points: POINTS.spf.softfail }],
				raw,
			};
		case 'neutral':
			return {
				...base,
				status: 'warn',
				title: 'Absender unklar',
				text: `${domain} legt sich nicht fest, ob dieser Server senden darf. Das hilft Empfängern nicht weiter.`,
				deductions: [{ reason: 'SPF neutral', points: POINTS.spf.neutral }],
				raw,
			};
		case 'fail':
			return {
				...base,
				status: 'bad',
				title: 'Absender abgelehnt',
				text: `${domain} sagt ausdrücklich, dass dieser Server keine Mails für sie senden darf. Genau von dort kam deine Mail. Viele Empfänger lehnen sie deshalb ab.`,
				deductions: [{ reason: 'SPF fail', points: POINTS.spf.fail }],
				raw,
			};
		case 'permerror':
			return {
				...base,
				status: 'bad',
				title: 'Absender-Eintrag fehlerhaft',
				text: `Der SPF-Eintrag von ${domain} ist kaputt, z. B. weil es zwei Einträge gibt oder zu viele Verweise. Empfänger ignorieren ihn dann komplett.`,
				deductions: [{ reason: 'SPF fehlerhaft (permerror)', points: POINTS.spf.permerror }],
				raw,
			};
		default:
			return {
				...base,
				guide: undefined,
				status: 'warn',
				title: 'Absender gerade nicht prüfbar',
				text: `Der DNS-Server von ${domain} hat nicht rechtzeitig geantwortet. Teste in ein paar Minuten noch einmal.`,
				deductions: [{ reason: 'SPF temperror', points: POINTS.spf.temperror }],
				raw,
			};
	}
}

const DKIM_RANK: Record<string, number> = { pass: 0, policy: 1, fail: 2, neutral: 3, temperror: 4, none: 5 };

export function dkimFinding(signatures: DkimSignature[], fromDomain: string | null): Finding {
	const base = { id: 'dkim' as const, tech: 'DKIM', guide: 'dkim' as const };
	const real = signatures.filter((s) => s.status.result !== 'none');
	const raw = {
		signatures: real.map((s) => ({
			domain: s.signingDomain,
			selector: s.selector,
			algo: s.algo,
			bits: s.modulusLength ?? null,
			result: s.status.result,
			comment: s.status.comment ?? null,
			aligned: s.status.aligned || false,
		})),
	};
	if (real.length === 0) {
		return {
			...base,
			status: 'bad',
			title: 'Mail nicht unterschrieben',
			text: 'Deine Mail hat keine digitale Unterschrift. Empfänger können nicht sehen, ob sie wirklich von dir kommt und unterwegs unverändert blieb.',
			deductions: [{ reason: 'Keine DKIM-Signatur', points: POINTS.dkim.none }],
			raw,
		};
	}
	const aligned = real.find((s) => s.status.result === 'pass' && s.status.aligned);
	if (aligned) {
		const weak = aligned.algo?.startsWith('rsa') && (aligned.modulusLength ?? 2048) < 2048;
		return {
			...base,
			guide: undefined,
			status: 'ok',
			title: 'Mail unterschrieben',
			text: weak
				? `Deine Mail trägt eine gültige Unterschrift von ${aligned.signingDomain}. Tipp: Der Schlüssel ist mit ${aligned.modulusLength} Bit kurz, empfohlen sind 2048 Bit.`
				: `Deine Mail trägt eine gültige Unterschrift von ${aligned.signingDomain}. Empfänger sehen, dass sie unterwegs nicht verändert wurde.`,
			deductions: [],
			raw,
		};
	}
	const pass = real.find((s) => s.status.result === 'pass');
	if (pass) {
		return {
			...base,
			status: 'warn',
			title: 'Unterschrift vom falschen Absender',
			text: `Deine Mail ist gültig unterschrieben, aber von ${pass.signingDomain} statt von ${fromDomain ?? 'deiner Domain'}. Meist ist das dein Versanddienst. Richte die Unterschrift für deine eigene Domain ein.`,
			deductions: [{ reason: 'DKIM nicht passend zur Absender-Domain', points: POINTS.dkim.notAligned }],
			raw,
		};
	}
	const worst = real.slice().sort((a, b) => (DKIM_RANK[a.status.result] ?? 9) - (DKIM_RANK[b.status.result] ?? 9))[0];
	if (worst.status.result === 'temperror') {
		return {
			...base,
			guide: undefined,
			status: 'warn',
			title: 'Unterschrift gerade nicht prüfbar',
			text: 'Der Schlüssel zur Unterschrift ließ sich gerade nicht abrufen. Teste in ein paar Minuten noch einmal.',
			deductions: [{ reason: 'DKIM temperror', points: POINTS.dkim.temperror }],
			raw,
		};
	}
	return {
		...base,
		status: 'bad',
		title: 'Unterschrift ungültig',
		text: dkimFailText(worst),
		deductions: [{ reason: `DKIM ${worst.status.result}`, points: POINTS.dkim.fail }],
		raw,
	};
}

function dkimFailText(sig: DkimSignature): string {
	const c = sig.status.comment ?? '';
	const where = sig.selector && sig.signingDomain ? ` (gesucht unter ${sig.selector}._domainkey.${sig.signingDomain})` : '';
	if (c.includes('no key')) return `Deine Mail ist unterschrieben, aber der passende Schlüssel fehlt in deinem DNS${where}. Ohne ihn ist die Unterschrift wertlos.`;
	if (c.includes('body hash')) return 'Deine Mail wurde nach dem Unterschreiben verändert, z. B. durch eine automatische Signatur oder einen Virenscanner. Die Unterschrift passt deshalb nicht mehr.';
	if (sig.status.result === 'policy') return 'Der Schlüssel deiner Unterschrift ist zu kurz und gilt als unsicher. Erzeuge einen neuen mit 2048 Bit.';
	if (c.includes('invalid public key')) return `Der Schlüssel in deinem DNS ist beschädigt oder unvollständig${where}. Oft fehlt beim Kopieren ein Teil.`;
	return 'Deine Mail ist unterschrieben, aber die Unterschrift stimmt nicht. Empfänger behandeln sie wie eine Mail ohne Unterschrift.';
}

export function dmarcFinding(dmarc: DmarcResult | false, fromDomain: string | null): Finding {
	const base = { id: 'dmarc' as const, tech: 'DMARC', guide: 'dmarc' as const };
	const domain = fromDomain ?? 'deine Domain';
	const suggestion = fromDomain
		? { type: 'TXT' as const, host: `_dmarc.${fromDomain}`, value: `v=DMARC1; p=none; rua=mailto:dmarc@${fromDomain}` }
		: undefined;
	if (!dmarc) {
		return {
			...base,
			guide: undefined,
			status: 'bad',
			title: 'Absenderadresse ungültig',
			text: 'Die Absenderadresse (From) deiner Mail fehlt oder ist fehlerhaft. Spamfilter werten das als starkes Warnsignal.',
			deductions: [{ reason: 'Kein gültiger From-Header', points: POINTS.dmarc.fail }],
			raw: {},
		};
	}
	const raw = {
		result: dmarc.status.result,
		record: dmarc.rr ?? null,
		policy: dmarc.policy ?? null,
		spfAligned: dmarc.alignment?.spf?.result ?? null,
		dkimAligned: dmarc.alignment?.dkim?.result ?? null,
	};
	switch (dmarc.status.result) {
		case 'none':
			return {
				...base,
				status: 'bad',
				title: 'Schutzregel fehlt',
				text: `Für ${domain} gibt es keine Regel, was mit gefälschten Mails in deinem Namen passieren soll. Gmail und Outlook erwarten diese Regel inzwischen.`,
				deductions: [{ reason: 'Kein DMARC-Eintrag', points: POINTS.dmarc.none }],
				suggestion,
				raw,
			};
		case 'pass':
			if (dmarc.policy === 'none') {
				return {
					...base,
					status: 'warn',
					title: 'Schutzregel im Testmodus',
					text: `${domain} hat eine Schutzregel, aber nur im Beobachtungsmodus (p=none). Gefälschte Mails werden noch nicht aussortiert. Wenn alle deine Dienste sauber senden, stell auf „quarantine“ um.`,
					deductions: [{ reason: 'DMARC nur p=none', points: POINTS.dmarc.monitorOnly }],
					raw,
				};
			}
			return {
				...base,
				guide: undefined,
				status: 'ok',
				title: 'Schutzregel aktiv',
				text: `${domain} legt fest, dass gefälschte Mails ${dmarc.policy === 'reject' ? 'abgelehnt' : 'aussortiert'} werden. Deine Mail erfüllt die Regel.`,
				deductions: [],
				raw,
			};
		case 'fail':
			return {
				...base,
				status: 'bad',
				title: 'Schutzregel nicht erfüllt',
				text: `${domain} hat eine Schutzregel, aber diese Mail erfüllt sie nicht: Weder Absender-Bestätigung noch Unterschrift passen zu deiner Absenderadresse.${dmarc.policy === 'reject' ? ' Empfänger lehnen sie deshalb ab.' : dmarc.policy === 'quarantine' ? ' Empfänger stecken sie deshalb in den Spam.' : ''}`,
				deductions: [{ reason: 'DMARC fail', points: POINTS.dmarc.fail }],
				raw,
			};
		default:
			return {
				...base,
				guide: undefined,
				status: 'warn',
				title: 'Schutzregel gerade nicht prüfbar',
				text: 'Der DNS-Server hat nicht rechtzeitig geantwortet. Teste in ein paar Minuten noch einmal.',
				deductions: [{ reason: 'DMARC temperror', points: POINTS.dmarc.temperror }],
				raw,
			};
	}
}
