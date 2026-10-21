// Result model shared by engine (producer) and web (renderer).

export type Status = 'ok' | 'warn' | 'bad' | 'skip';

export type CheckId = 'spf' | 'dkim' | 'dmarc' | 'reputation' | 'content';

/** Topics a "So behebst du das" guide exists for. */
export type GuideTopic = 'spf' | 'dkim' | 'dmarc';

export interface Deduction {
	/** Short reason, plain German. */
	reason: string;
	/** Points subtracted from 10. */
	points: number;
}

export interface Finding {
	id: CheckId;
	status: Status;
	/** Plain-language title, e.g. "Schutzregel fehlt". */
	title: string;
	/** Technical term shown small under the title, e.g. "DMARC". */
	tech: string;
	/** One or two plain sentences. */
	text: string;
	deductions: Deduction[];
	/** Set when a provider guide can fix this finding. */
	guide?: GuideTopic;
	/** Suggested DNS value to copy, if any. */
	suggestion?: { type: 'TXT'; host: string; value: string };
	/** Raw technical details for experts (no message content). */
	raw: Record<string, unknown>;
	/** Points gained if this finding is fixed (sum of its deductions). Set by enrichFindings. */
	gain?: number;
	/** How much fixing it matters. Set by enrichFindings. */
	impact?: Impact;
}

export type Impact = 'hoch' | 'mittel' | 'gering';

/** Score ranges shown on the site: 0–4.9, 5–6.9, 7–8.9, 9–10. */
export type Band = 'risk' | 'endangered' | 'solid' | 'good';

export interface SubScores {
	/** 0–100 per area; null if nothing in that area could be checked. */
	auth: number | null;
	reputation: number | null;
	content: number | null;
}

/** Envelope facts of the received mail, shown in the result header. */
export interface MailMeta {
	from: string | null;
	/** Subject, cut to 80 characters. */
	subject: string | null;
	receivedAt: string;
	tls: { used: boolean; version: string | null };
}

export interface MailResult {
	id: string;
	createdAt: string;
	expiresAt: string;
	score: number;
	light: 'ok' | 'warn' | 'bad';
	band: Band;
	/** True if SPF, DKIM or DMARC failed: we always warn, whatever the score. */
	authWarning: boolean;
	subScores: SubScores;
	/** Verdict headline in plain language. */
	headline: string;
	/** "Was das für dich bedeutet". */
	sub: string;
	mail: MailMeta;
	/** Sender domain from the From header, needed for guides (e.g. DMARC host). */
	fromDomain: string | null;
	findings: Finding[];
}

/** Steps of the live progress, in display order. */
export const STEPS = ['received', 'spf', 'dkim', 'dmarc', 'reputation', 'content'] as const;
export type StepId = (typeof STEPS)[number];

export const STEP_LABELS: Record<StepId, string> = {
	received: 'Mail empfangen',
	spf: 'Absender prüfen',
	dkim: 'Unterschrift prüfen',
	dmarc: 'Schutzregel prüfen',
	reputation: 'Server-Ruf prüfen',
	content: 'Inhalt analysieren',
};

export type TestState = 'waiting' | 'analyzing' | 'done' | 'expired' | 'error';

export interface TestStatus {
	id: string;
	address: string;
	state: TestState;
	/** Steps already finished, in order of completion. */
	done: StepId[];
	resultId: string | null;
	expiresAt: string;
}

/** Live extras for one finished step: interim status and a short line with real values. */
export interface StepInfo {
	status?: Finding['status'];
	detail?: string;
	/** Only on "received": shown to the person running the test, kept in RAM only. */
	mail?: { from: string | null; subject: string | null };
}

/** Server-sent event payloads. */
export type ProgressEvent =
	| ({ type: 'step'; step: StepId } & StepInfo)
	| { type: 'done'; resultId: string }
	| { type: 'error'; message: string }
	| { type: 'expired' };

export interface DnsCheckResult {
	domain: string;
	light: 'ok' | 'warn' | 'bad';
	headline: string;
	findings: Finding[];
	checkedAt: string;
}
