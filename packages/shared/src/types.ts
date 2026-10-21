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
}

export interface MailResult {
	id: string;
	createdAt: string;
	expiresAt: string;
	score: number;
	light: 'ok' | 'warn' | 'bad';
	headline: string;
	sub: string;
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

/** Server-sent event payloads. */
export type ProgressEvent =
	| { type: 'step'; step: StepId }
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
