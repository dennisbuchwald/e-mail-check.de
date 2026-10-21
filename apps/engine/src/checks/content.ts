// Content score via rspamd. Authentication and IP reputation symbols are ignored,
// because SPF/DKIM/DMARC/blocklists are scored by our own checks.
import { contentDeduction, POINTS, round1, RSPAMD_SYMBOLE, type Deduction, type Finding } from '@emc/shared';
import type { LinkSummary } from './links.ts';
import type { UnsubscribeReport } from './unsubscribe.ts';
import type { SmtpEnvelope } from './auth.ts';

export interface RspamdSymbol {
	name: string;
	score: number;
	description?: string;
}

const IGNORED = [
	/^R_SPF_/, /^R_DKIM_/, /^DKIM_/, /^DMARC_/, /^ARC_/, /^RBL_/, /^RECEIVED_/, /^RCVD_/, /^RWL_/, /^DWL_/,
	/^ASN$/, /^IP_SCORE/, /^MX_/, /^AUTH_NA/, /^BAYES_/, /^NEURAL_/, /^FUZZY_/, /^GREYLIST/, /^R_PARTS_DIFFER$/,
	/^ONCE_RECEIVED/, /^DMARC_POLICY/, /^FORGED_SENDER$/, /^R_MISSING_CHARSET$/, /^HFILTER_HELO/, /^RDNS_/, /^HFILTER_HOSTNAME/,
];

/** Symbols caused by common mail programs, not by the sender: never shown as a tip. */
const CLIENT_QUIRKS = new Set(['MV_CASE']);

/** German names and explanations: packages/shared/src/rspamd-symbole.de.json (unknown rules keep their name). */
const TEXTS: Record<string, string> = Object.fromEntries(Object.entries(RSPAMD_SYMBOLE).map(([k, v]) => [k, v.text]));

export interface ContentAnalysis {
	score: number;
	symbols: RspamdSymbol[];
}

export async function scanWithRspamd(url: string, message: Buffer, env: SmtpEnvelope, rcpt: string): Promise<ContentAnalysis> {
	const headers: Record<string, string> = { IP: env.ip, Helo: env.helo, Rcpt: rcpt, Pass: 'all' };
	if (env.sender) headers.From = env.sender;
	const res = await fetch(`${url}/checkv2`, { method: 'POST', headers, body: new Uint8Array(message), signal: AbortSignal.timeout(15000) });
	if (!res.ok) throw new Error(`rspamd HTTP ${res.status}`);
	const json = (await res.json()) as { action?: string; required_score?: number; symbols?: Record<string, RspamdSymbol> };
	const symbols = Object.values(json.symbols ?? {})
		.filter((s) => !IGNORED.some((re) => re.test(s.name)))
		// Only rule name, score and rspamd's generic description. Never `options`: they contain
		// excerpts of the message (links, words), which must not outlive the analysis.
		.map((s) => ({ name: s.name, score: round1(s.score), description: s.description }));
	let score = round1(symbols.reduce((sum, s) => sum + s.score, 0));
	// Pre-filters like GTUBE reject outright with 0 points: treat that as clear spam.
	if (json.action === 'reject' && symbols.some((s) => s.name === 'GTUBE')) {
		score = Math.max(score, json.required_score ?? 15);
		symbols.find((s) => s.name === 'GTUBE')!.score = score;
	}
	return { score, symbols };
}

/** Counts from the parsed mail, never its text. */
export interface BodyStats {
	/** Words in the readable text (text part, or HTML without tags). */
	words: number;
	images: number;
	hasHtml: boolean;
	hasText: boolean;
	/** Length of the HTML source in characters. */
	htmlChars: number;
}

export interface ContentExtras {
	error?: string;
	links?: LinkSummary | null;
	unsubscribe?: UnsubscribeReport | null;
	body?: BodyStats | null;
}

/** One own content check, shown at station 6 next to the spam filter rules. */
export interface ContentCheck {
	id: string;
	status: 'ok' | 'warn' | 'info';
	title: string;
	text: string;
	points: number;
}

const has = (analysis: ContentAnalysis | null, names: RegExp) => !!analysis?.symbols.some((s) => names.test(s.name) && s.score > 0);

/** Own checks for things rspamd does not weigh. Points only where rspamd did not already flag the same thing. */
export function ownContentChecks(analysis: ContentAnalysis | null, extras: ContentExtras): ContentCheck[] {
	const { links, unsubscribe, body } = extras;
	const out: ContentCheck[] = [];
	if (links?.shorteners.length) {
		out.push({ id: 'shortener', status: 'warn', title: 'Kurz-Links', text: `Die Mail enthält Kurz-Links (${links.shorteners.join(', ')}). Spamfilter misstrauen ihnen, weil sie das Ziel verstecken. Verlinke lieber direkt auf deine Seite.`, points: POINTS.content.shortener });
	}
	if (unsubscribe?.bulk && !unsubscribe.header) {
		out.push({ id: 'unsubscribe', status: 'warn', title: 'Abmelde-Link im Header fehlt', text: 'Das sieht nach einem Newsletter aus. Für Newsletter verlangen Gmail und Yahoo einen Abmelde-Link im Header (List-Unsubscribe). In den meisten Newsletter-Tools ist das eine Einstellung.', points: POINTS.content.noUnsubscribeHeader });
	} else if (unsubscribe?.bulk && !unsubscribe.oneClick) {
		out.push({ id: 'one-click', status: 'warn', title: 'Abmeldung mit einem Klick fehlt', text: 'Ergänze die Abmeldung mit einem Klick (List-Unsubscribe-Post, RFC 8058). Gmail und Yahoo erwarten sie von Massenversendern.', points: 0 });
	} else if (unsubscribe?.bulk && unsubscribe.oneClick) {
		out.push({ id: 'one-click', status: 'ok', title: 'Abmeldung mit einem Klick', text: 'List-Unsubscribe und List-Unsubscribe-Post sind korrekt gesetzt.', points: 0 });
	}
	if (body) {
		if (body.images > 0 && body.words < 10) {
			out.push({ id: 'image-only', status: 'warn', title: 'Fast nur ein Bild', text: 'Die Mail besteht fast nur aus Bildern. Spamfilter können Bilder nicht lesen und werden misstrauisch. Schreib die wichtigste Aussage als Text dazu.', points: has(analysis, /^(R_SUSPICIOUS_IMAGES|HTML_SHORT_LINK_IMG_\d|R_EMPTY_IMAGE)$/) ? 0 : POINTS.content.imageOnly });
		} else if (body.hasHtml && body.htmlChars > 3000 && body.words < 60) {
			out.push({ id: 'low-text', status: 'warn', title: 'Wenig Text, viel HTML', text: 'Die Mail hat viel HTML-Code, aber kaum lesbaren Text. Ein ausgewogenes Verhältnis wirkt auf Spamfilter vertrauenswürdiger.', points: POINTS.content.lowText });
		}
		if (body.hasHtml && !body.hasText) {
			out.push({ id: 'html-only', status: 'warn', title: 'Keine Textfassung', text: 'Die Mail hat nur eine HTML-Fassung. Eine zusätzliche reine Textfassung (multipart/alternative) mögen Spamfilter und Screenreader.', points: 0 });
		}
		if (body.words > 0 && body.words < 15) {
			out.push({ id: 'short', status: 'info', title: 'Sehr kurze Mail', text: 'Die Testmail ist sehr kurz. Für ein aussagekräftiges Ergebnis schick eine Mail, wie du sie sonst auch schreibst.', points: 0 });
		}
	}
	return out;
}

export function contentFinding(analysis: ContentAnalysis | null, extras: ContentExtras = {}): Finding {
	const base = { id: 'content' as const, tech: 'Spamfilter, Inhalt, Links' };
	const { links, unsubscribe, body } = extras;
	const deductions: Deduction[] = [];
	const problems: string[] = [];
	const tips: string[] = [];
	/** Hints from rspamd rules with 0 points: mentioned, but they do not turn the station orange. */
	const softTips: string[] = [];

	// 1. Spam filter (rspamd)
	const rspamdPoints = analysis ? contentDeduction(analysis.score) : 0;
	if (analysis) {
		const hits = analysis.symbols.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
		const explained = hits.slice(0, 3).map((s) => TEXTS[s.name] ?? `Spamfilter-Regel ${s.name}${s.description ? `: ${s.description}` : ''}.`);
		if (rspamdPoints > 0) {
			deductions.push({ reason: `Spamfilter-Punkte: ${analysis.score}`, points: rspamdPoints });
			problems.push(...explained);
		} else {
			// Tips only for things the sender can change. Quirks of the mail program itself
			// (e.g. Apple Mail writes "Mime-Version") stay in the raw data.
			const tip = hits.find((s) => s.score >= 0.3 && TEXTS[s.name] && !CLIENT_QUIRKS.has(s.name));
			if (tip) softTips.push(TEXTS[tip.name]);
		}
	}

	// 2. Own checks (links, newsletter header, text vs. images)
	const checks = ownContentChecks(analysis, extras);
	for (const c of checks) {
		if (c.points > 0) {
			deductions.push({ reason: c.title, points: c.points });
			problems.push(c.text);
		} else if (c.status === 'warn') tips.push(c.text);
	}

	const raw = {
		rspamdScore: analysis?.score ?? null,
		symbols: analysis?.symbols ?? [],
		...(analysis ? {} : { spamfilterError: extras.error ?? 'unavailable' }),
		links: links ? { total: links.total, domains: links.domains, shorteners: links.shorteners } : null,
		unsubscribe: unsubscribe ?? null,
		body: body ?? null,
		checks,
	};
	const tipText = [...tips, ...softTips].length ? ` Tipp: ${[...tips, ...softTips].join(' ')}` : '';

	if (!analysis && problems.length === 0) {
		return { ...base, status: 'skip', title: 'Inhalt nicht geprüft', text: `Der Spamfilter war gerade nicht erreichbar. Die anderen Prüfungen sind davon nicht betroffen.${tipText}`, deductions, raw };
	}
	if (problems.length === 0) {
		return {
			...base,
			status: tips.length ? 'warn' : 'ok',
			title: tips.length ? 'Inhalt: ein Tipp' : 'Inhalt unauffällig',
			text: `Der Spamfilter hat in Betreff, Text und Links nichts Verdächtiges gefunden.${tipText}`,
			deductions,
			raw,
		};
	}
	const bad = rspamdPoints >= 2;
	return {
		...base,
		status: bad ? 'bad' : 'warn',
		title: bad ? 'Inhalt wirkt wie Spam' : 'Inhalt: kleine Auffälligkeiten',
		text: `${problems.join(' ')}${analysis ? '' : ' (Der Spamfilter selbst war gerade nicht erreichbar.)'}${tipText}`,
		deductions,
		raw,
	};
}
