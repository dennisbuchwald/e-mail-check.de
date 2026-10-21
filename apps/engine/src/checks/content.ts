// Content score via rspamd. Authentication and IP reputation symbols are ignored,
// because SPF/DKIM/DMARC/blocklists are scored by our own checks.
import { contentDeduction, POINTS, round1, type Deduction, type Finding } from '@emc/shared';
import type { LinkReport } from './links.ts';
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

/** Plain-language explanations for common content symbols. */
const TEXTS: Record<string, string> = {
	MISSING_MIME_VERSION: 'Der Mail fehlt die technische Angabe „MIME-Version“. Das passiert meist bei selbst gebauten Formularen oder Skripten.',
	MIME_HEADER_CTYPE_ONLY: 'Die Mail hat nur eine unvollständige technische Formatangabe. Typisch für selbst gebaute Versand-Skripte.',
	URL_NUMERIC_IP: 'Ein Link zeigt auf eine nackte IP-Adresse statt auf einen Domainnamen. Das ist typisch für Spam.',
	URL_NUMERIC_IP_USER: 'Ein Link zeigt auf eine nackte IP-Adresse statt auf einen Domainnamen. Das ist typisch für Spam.',
	R_SUSPICIOUS_URL: 'Ein Link sieht verdächtig aus, z. B. eine nackte IP-Adresse statt eines Namens.',
	HAS_IPFS_GATEWAY_URL: 'Ein Link führt auf einen IPFS-Speicher, den Betrüger oft für Phishing nutzen.',
	OMOGRAPH_URL: 'Ein Link nutzt Buchstaben, die bekannten Namen nur ähneln (z. B. kyrillisches „а“).',
	REDIRECTOR_URL: 'Die Mail enthält einen Weiterleitungs-Link. Spamfilter mögen keine versteckten Ziele.',
	FROM_DN_EQ_ADDR: 'Der Absendername ist identisch mit der Mailadresse. Setz lieber einen echten Namen.',
	SUBJECT_ENDS_EXCLAIM: 'Der Betreff endet mit einem Ausrufezeichen. Das ist ein leichtes Spam-Signal.',
	SUBJECT_HAS_EXCLAIM: 'Der Betreff enthält Ausrufezeichen. Das ist ein leichtes Spam-Signal.',
	SUBJECT_HAS_CURRENCY: 'Der Betreff enthält ein Währungszeichen. Das ist ein leichtes Spam-Signal.',
	HTML_SHORT_LINK_IMG_1: 'Die Mail enthält ein verlinktes Bild bei sehr wenig Text.',
	SUBJ_ALL_CAPS: 'Der Betreff steht komplett in Großbuchstaben. Das wirkt auf Spamfilter verdächtig.',
	MISSING_SUBJECT: 'Die Mail hat keinen Betreff.',
	EMPTY_SUBJECT: 'Der Betreff ist leer.',
	MISSING_DATE: 'Der Mail fehlt das Datum. Das passiert meist bei selbst gebauten Formularen.',
	MISSING_MID: 'Der Mail fehlt die Nachrichten-ID (Message-ID). Das passiert meist bei selbst gebauten Formularen.',
	MID_RHS_NOT_FQDN: 'Die Nachrichten-ID enthält keinen richtigen Servernamen.',
	MISSING_TO: 'Die Mail hat keinen Empfänger im „An“-Feld.',
	MIME_HTML_ONLY: 'Die Mail besteht nur aus HTML, ohne reine Textfassung. Spamfilter mögen das nicht.',
	R_SUSPICIOUS_IMAGES: 'Die Mail besteht fast nur aus Bildern und hat kaum Text.',
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

export interface ContentExtras {
	error?: string;
	links?: LinkReport | null;
	unsubscribe?: UnsubscribeReport | null;
}

export function contentFinding(analysis: ContentAnalysis | null, extras: ContentExtras = {}): Finding {
	const base = { id: 'content' as const, tech: 'Spam-Score, Links, Abmelde-Link' };
	const { links, unsubscribe } = extras;
	const deductions: Deduction[] = [];
	const problems: string[] = [];
	const tips: string[] = [];

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
			if (tip) tips.push(TEXTS[tip.name]);
		}
	}

	// 2. Links
	if (links?.dead.length) {
		const n = links.dead.length;
		deductions.push({ reason: `${n} ${n === 1 ? 'Link funktioniert' : 'Links funktionieren'} nicht`, points: round1(Math.min(POINTS.content.deadLinkCap, n * POINTS.content.deadLink)) });
		problems.push(`${n === 1 ? 'Ein Link führt' : `${n} Links führen`} ins Leere: ${links.dead.map((d) => `${d.host}, ${d.reason}`).join('; ')}. Tote Links wirken auf Spamfilter und Leser unseriös.`);
	}
	if (links?.shorteners.length) {
		deductions.push({ reason: 'Kurz-Links', points: POINTS.content.shortener });
		problems.push(`Die Mail enthält Kurz-Links (${links.shorteners.join(', ')}). Spamfilter misstrauen ihnen, weil sie das Ziel verstecken. Verlinke lieber direkt auf deine Seite.`);
	}

	// 3. Newsletter: List-Unsubscribe
	if (unsubscribe?.bulk && !unsubscribe.header) {
		deductions.push({ reason: 'Newsletter ohne Abmelde-Kopfzeile', points: POINTS.content.noUnsubscribeHeader });
		problems.push('Das sieht nach einem Newsletter aus, aber die Abmelde-Kopfzeile (List-Unsubscribe) fehlt. Gmail und Yahoo verlangen sie seit 2024 von Massenversendern. In den meisten Newsletter-Tools ist das eine Einstellung.');
	} else if (unsubscribe?.bulk && !unsubscribe.oneClick) {
		tips.push('Ergänze die Abmeldung mit einem Klick (List-Unsubscribe-Post). Gmail und Yahoo erwarten sie von Massenversendern.');
	}

	const raw = {
		rspamdScore: analysis?.score ?? null,
		symbols: analysis?.symbols ?? [],
		...(analysis ? {} : { spamfilterError: extras.error ?? 'unavailable' }),
		links: links ? { found: links.total, checked: links.checked, dead: links.dead, shorteners: links.shorteners } : null,
		unsubscribe: unsubscribe ?? null,
	};
	const linkNote = links && links.checked > 0 && !links.dead.length ? ` Alle ${links.checked} geprüften Links funktionieren.` : '';
	const tipText = tips.length ? ` Tipp: ${tips.join(' ')}` : '';

	if (!analysis && problems.length === 0) {
		return {
			...base,
			status: 'skip',
			title: 'Inhalt nicht geprüft',
			text: `Der Spamfilter war gerade nicht erreichbar. Die anderen Prüfungen sind davon nicht betroffen.${linkNote}${tipText}`,
			deductions,
			raw,
		};
	}
	if (problems.length === 0) {
		const good = unsubscribe?.bulk && unsubscribe.oneClick ? ' Die Abmeldung mit einem Klick ist korrekt eingerichtet.' : '';
		return {
			...base,
			status: 'ok',
			title: 'Inhalt unauffällig',
			text: `Der Spamfilter hat in Betreff, Text und Links nichts Verdächtiges gefunden.${linkNote}${good}${tipText}`,
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
