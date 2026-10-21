// Content score via rspamd. Authentication and IP reputation symbols are ignored,
// because SPF/DKIM/DMARC/blocklists are scored by our own checks.
import { contentDeduction, round1, type Finding } from '@emc/shared';
import type { SmtpEnvelope } from './auth.ts';

export interface RspamdSymbol {
	name: string;
	score: number;
	description?: string;
	options?: string[];
}

const IGNORED = [
	/^R_SPF_/, /^R_DKIM_/, /^DKIM_/, /^DMARC_/, /^ARC_/, /^RBL_/, /^RECEIVED_/, /^RCVD_/, /^RWL_/, /^DWL_/,
	/^ASN$/, /^IP_SCORE/, /^MX_/, /^AUTH_NA/, /^BAYES_/, /^NEURAL_/, /^FUZZY_/, /^GREYLIST/, /^R_PARTS_DIFFER$/,
	/^ONCE_RECEIVED/, /^DMARC_POLICY/, /^FORGED_SENDER$/, /^R_MISSING_CHARSET$/, /^HFILTER_HELO/, /^RDNS_/, /^HFILTER_HOSTNAME/,
];

/** Plain-language explanations for common content symbols. */
const TEXTS: Record<string, string> = {
	SUBJ_ALL_CAPS: 'Der Betreff steht komplett in Großbuchstaben. Das wirkt auf Spamfilter verdächtig.',
	MISSING_SUBJECT: 'Die Mail hat keinen Betreff.',
	EMPTY_SUBJECT: 'Der Betreff ist leer.',
	MISSING_DATE: 'Der Mail fehlt das Datum. Das passiert meist bei selbst gebauten Formularen.',
	MISSING_MID: 'Der Mail fehlt die Nachrichten-ID (Message-ID). Das passiert meist bei selbst gebauten Formularen.',
	MID_RHS_NOT_FQDN: 'Die Nachrichten-ID enthält keinen richtigen Servernamen.',
	MISSING_TO: 'Die Mail hat keinen Empfänger im „An“-Feld.',
	MIME_HTML_ONLY: 'Die Mail besteht nur aus HTML, ohne reine Textfassung. Spamfilter mögen das nicht.',
	R_SUSPICIOUS_URL: 'Ein Link sieht verdächtig aus, z. B. eine nackte IP-Adresse statt eines Namens.',
	R_SUSPICIOUS_IMAGES: 'Die Mail besteht fast nur aus Bildern und hat kaum Text.',
	HTML_SHORT_LINK_IMG_1: 'Die Mail enthält ein verlinktes Bild bei sehr wenig Text.',
	HTML_SHORT_LINK_IMG_2: 'Die Mail enthält verlinkte Bilder bei sehr wenig Text.',
	HTML_SHORT_LINK_IMG_3: 'Die Mail enthält verlinkte Bilder bei sehr wenig Text.',
	MANY_INVISIBLE_PARTS: 'Die Mail enthält viele unsichtbare Textteile. Das ist ein typischer Spam-Trick.',
	FROM_NAME_HAS_TITLE: 'Der Absendername enthält einen Titel wie „Dr.“ oder „Mr.“, ein häufiges Spam-Muster.',
	FROM_EXCESS_BASE64: 'Der Absendername ist unnötig codiert.',
	SUBJ_EXCESS_BASE64: 'Der Betreff ist unnötig codiert.',
	SUBJ_EXCESS_QP: 'Der Betreff ist unnötig codiert.',
	GTUBE: 'Die Mail enthält das offizielle Spam-Testmuster (GTUBE).',
	DBL_SPAM: 'Ein Link in deiner Mail führt auf eine Domain, die auf einer Sperrliste steht.',
	DBL_PHISH: 'Ein Link in deiner Mail führt auf eine bekannte Phishing-Domain.',
	DBL_ABUSE_REDIR: 'Ein Link in deiner Mail nutzt eine missbrauchte Weiterleitung.',
	URIBL_BLACK: 'Ein Link in deiner Mail steht auf einer Sperrliste.',
	SURBL_MULTI: 'Ein Link in deiner Mail steht auf einer Sperrliste.',
	PHISHING: 'Ein Link zeigt einen anderen Text an, als er wirklich öffnet. Das ist ein typisches Phishing-Muster.',
	REPLYTO_ADDR_EQ_FROM: 'Die Antwortadresse ist identisch mit der Absenderadresse und dabei unnötig gesetzt.',
	FREEMAIL_REPLYTO: 'Antworten gehen an eine Freemail-Adresse (z. B. Gmail), obwohl du von deiner Domain sendest.',
	R_BAD_CTE_7BIT: 'Die Mail enthält Sonderzeichen, ist aber als reiner ASCII-Text gekennzeichnet.',
	BROKEN_CONTENT_TYPE: 'Der technische Aufbau der Mail (Content-Type) ist fehlerhaft.',
	MV_CASE: 'Ein technischer Kopfeintrag ist ungewöhnlich geschrieben.',
	R_NO_SPACE_IN_FROM: 'Im Absender fehlt das Leerzeichen zwischen Name und Adresse.',
	HAS_DATA_URI: 'Die Mail enthält eingebettete Daten-Links, die Spamfilter misstrauisch machen.',
	SHORT_PART_BAD_HEADERS: 'Ein Teil der Mail hat fehlerhafte technische Angaben.',
	MIME_BAD_ATTACHMENT: 'Die Mail hat einen Anhang mit riskantem Dateityp.',
	MIME_DOUBLE_BAD_EXTENSION: 'Ein Anhang tarnt seinen Dateityp mit einer doppelten Endung.',
	CTYPE_MIXED_BOGUS: 'Die Mail ist als „mit Anhang“ gekennzeichnet, hat aber keinen.',
	DATE_IN_FUTURE: 'Das Datum der Mail liegt in der Zukunft. Prüf die Uhrzeit deines Servers.',
	DATE_IN_PAST: 'Das Datum der Mail liegt weit in der Vergangenheit. Prüf die Uhrzeit deines Servers.',
	INVALID_DATE: 'Das Datum der Mail hat ein ungültiges Format.',
};

export interface ContentAnalysis {
	score: number;
	symbols: RspamdSymbol[];
}

export async function scanWithRspamd(url: string, message: Buffer, env: SmtpEnvelope, rcpt: string): Promise<ContentAnalysis> {
	const headers: Record<string, string> = { IP: env.ip, Helo: env.helo, Rcpt: rcpt, Pass: 'all' };
	if (env.sender) headers.From = env.sender;
	const res = await fetch(`${url}/checkv2`, { method: 'POST', headers, body: new Uint8Array(message), signal: AbortSignal.timeout(15000) });
	if (!res.ok) throw new Error(`rspamd HTTP ${res.status}`);
	const json = (await res.json()) as { symbols?: Record<string, RspamdSymbol> };
	const symbols = Object.values(json.symbols ?? {})
		.filter((s) => !IGNORED.some((re) => re.test(s.name)))
		.map((s) => ({ name: s.name, score: round1(s.score), description: s.description, options: s.options?.slice(0, 3) }));
	const score = round1(symbols.reduce((sum, s) => sum + s.score, 0));
	return { score, symbols };
}

export function contentFinding(analysis: ContentAnalysis | null, error?: string): Finding {
	const base = { id: 'content' as const, tech: 'Spam-Score' };
	if (!analysis) {
		return {
			...base,
			status: 'skip',
			title: 'Inhalt nicht geprüft',
			text: 'Der Spamfilter war gerade nicht erreichbar. Die anderen Prüfungen sind davon nicht betroffen.',
			deductions: [],
			raw: { error: error ?? 'unavailable' },
		};
	}
	const points = contentDeduction(analysis.score);
	const hits = analysis.symbols.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
	const explained = hits.slice(0, 3).map((s) => TEXTS[s.name] ?? `Spamfilter-Regel ${s.name}${s.description ? `: ${s.description}` : ''}.`);
	const raw = { rspamdScore: analysis.score, symbols: analysis.symbols };
	const deductions = points > 0 ? [{ reason: `Spamfilter-Punkte: ${analysis.score}`, points }] : [];
	if (points === 0) {
		return {
			...base,
			status: 'ok',
			title: 'Inhalt unauffällig',
			text: explained.length > 0 && hits[0].score >= 0.5 ? `Der Spamfilter hat nichts Ernstes gefunden. Kleiner Tipp: ${explained[0]}` : 'Der Spamfilter hat in Betreff, Text und Links nichts Verdächtiges gefunden.',
			deductions,
			raw,
		};
	}
	return {
		...base,
		status: points >= 2 ? 'bad' : 'warn',
		title: points >= 2 ? 'Inhalt wirkt wie Spam' : 'Inhalt: kleine Auffälligkeiten',
		text: explained.join(' '),
		deductions,
		raw,
	};
}
