// Score model. Every point value lives here.
import type { Band, Finding, Impact, SubScores } from './types.ts';

export const POINTS = {
	spf: { none: 1.5, fail: 2, softfail: 1, neutral: 0.5, permerror: 1.5, temperror: 0.5 },
	dkim: { none: 2, fail: 2.5, notAligned: 0.5, temperror: 0.5 },
	dmarc: { none: 1.5, fail: 2.5, monitorOnly: 0.2, temperror: 0.5 },
	/** Freemail sender (gmail, icloud, gmx …): a hint, not a problem. */
	sender: { freemail: 0.2 },
	reputation: { majorList: 3, otherList: 1, listCap: 4, noPtr: 1, ptrMismatch: 0.5 },
	/** Transport to us: no TLS or outdated TLS. */
	transport: { noTls: 0.5, oldTls: 0.2 },
	/** Own content hints only count if rspamd did not already flag the same thing. */
	content: { cap: 4, shortener: 0.5, noUnsubscribeHeader: 0.3, imageOnly: 0.3, lowText: 0.2 },
} as const;

/** rspamd content score → deduction. Up to 1 point is normal for legitimate mail. */
export function contentDeduction(rspamdScore: number): number {
	if (rspamdScore <= 1) return 0;
	return round1(Math.min(POINTS.content.cap, (rspamdScore - 1) * 0.5));
}

export function round1(n: number): number {
	return Math.round(n * 10) / 10;
}

export function computeScore(findings: Finding[]): number {
	const total = findings.reduce((sum, f) => sum + f.deductions.reduce((s, d) => s + d.points, 0), 0);
	return round1(Math.max(0, 10 - total));
}

/** One ranking for status everywhere (scoring, stations, result view): higher is worse. */
export const STATUS_RANK = { bad: 3, warn: 2, ok: 1, skip: 0 } as const;

export function sortFindings<T extends Pick<Finding, 'status'>>(findings: T[]): T[] {
	return findings.slice().sort((a, b) => STATUS_RANK[b.status] - STATUS_RANK[a.status]);
}

export const BANDS: Record<Band, { label: string; from: number; to: number; text: string }> = {
	risk: { label: 'Hohes Risiko', from: 0, to: 4.9, text: 'Viele Mails landen im Spam. Erst beheben, dann versenden.' },
	endangered: { label: 'Gefährdet', from: 5, to: 6.9, text: 'Echtes Spam-Risiko. Die markierten Punkte zuerst angehen.' },
	solid: { label: 'Solide', from: 7, to: 8.9, text: 'Kommt meist an. Ein paar Details bringen Sicherheit.' },
	good: { label: 'Sehr gut', from: 9, to: 10, text: 'Alles im grünen Bereich. Weiter so.' },
};

export function bandFor(score: number): Band {
	if (score < 5) return 'risk';
	if (score < 7) return 'endangered';
	if (score < 9) return 'solid';
	return 'good';
}

const AUTH_IDS = ['spf', 'dkim', 'dmarc'] as const;

/** Exception rule: a failing SPF, DKIM or DMARC always warns, whatever the score. */
export function hasAuthFailure(findings: Pick<Finding, 'id' | 'status'>[]): boolean {
	return findings.some((f) => (AUTH_IDS as readonly string[]).includes(f.id) && f.status === 'bad');
}

export function trafficLight(score: number, findings: Pick<Finding, 'id' | 'status'>[]): 'ok' | 'warn' | 'bad' {
	// A failing SPF/DKIM/DMARC is "bad" whatever the score (exception rule).
	if (score < 5 || findings.some((f) => f.status === 'bad')) return 'bad';
	if (score < 9 || findings.some((f) => f.status === 'warn')) return 'warn';
	return 'ok';
}

/** Highest possible deduction per area, used to turn deductions into a percentage. */
export const AREA_MAX = {
	auth: POINTS.spf.fail + POINTS.sender.freemail + POINTS.dkim.fail + POINTS.dmarc.fail,
	reputation: POINTS.reputation.listCap + POINTS.reputation.noPtr + POINTS.transport.noTls,
	content: POINTS.content.cap + POINTS.content.shortener + POINTS.content.noUnsubscribeHeader + POINTS.content.imageOnly + POINTS.content.lowText,
} as const;

export function subScores(findings: Finding[]): SubScores {
	const area = (ids: string[], max: number): number | null => {
		const fs = findings.filter((f) => ids.includes(f.id));
		if (fs.length === 0 || fs.every((f) => f.status === 'skip')) return null;
		const ded = fs.reduce((s, f) => s + f.deductions.reduce((x, d) => x + d.points, 0), 0);
		return Math.max(0, Math.round(100 * (1 - ded / max)));
	};
	return { auth: area([...AUTH_IDS, 'sender'], AREA_MAX.auth), reputation: area(['reputation', 'transport'], AREA_MAX.reputation), content: area(['content'], AREA_MAX.content) };
}

export function impactFor(gain: number): Impact {
	if (gain >= 1.5) return 'hoch';
	if (gain >= 0.5) return 'mittel';
	return 'gering';
}

/** Adds gain/impact and sorts: problems first, then by gain, biggest effect first. */
export function enrichFindings(findings: Finding[]): Finding[] {
	const enriched = findings.map((f) => {
		const gain = round1(f.deductions.reduce((s, d) => s + d.points, 0));
		return { ...f, gain, impact: impactFor(gain) };
	});
	return enriched.sort((a, b) => STATUS_RANK[b.status] - STATUS_RANK[a.status] || (b.gain ?? 0) - (a.gain ?? 0));
}

const WORDS = ['Null', 'Eine', 'Zwei', 'Drei', 'Vier', 'Fünf', 'Sechs'];

/** Two-line verdict: line 1 ink, line 2 grey. */
export function verdictFor(score: number, findings: (Pick<Finding, 'status'> & { findings?: Finding[] })[]): { line1: string; line2: string } {
	const bad = findings.filter((f) => f.status === 'bad').length;
	// The spam filter itself says spam (rspamd ≥ 6): say so, whatever the other stations do.
	const rspamd = findings.flatMap((s) => s.findings ?? []).find((f) => f.id === 'content')?.raw?.rspamdScore;
	if (typeof rspamd === 'number' && rspamd >= 6) return { line1: 'Deine Mail landet im Spam.', line2: bad > 1 ? 'Der Inhalt ist das größte Problem.' : 'Der Inhalt ist das Problem.' };
	const warn = findings.filter((f) => f.status === 'warn').length;
	if (bandFor(score) === 'risk') return { line1: 'Hier landet viel im Spam.', line2: 'So behebst du es.' };
	if (bad > 0) return { line1: 'Deine Mail kommt an, aber nicht überall.', line2: bad === 1 ? 'Eine Sache solltest du beheben.' : `${bad} Dinge solltest du beheben.` };
	if (warn > 0) return { line1: 'Deine Mail kam sauber an.', line2: warn === 1 ? 'Ein Tipp für die letzte Stufe.' : `${WORDS[warn] ?? warn} Tipps für die letzte Stufe.` };
	return { line1: 'Deine Mail kam sauber an.', line2: 'Jede Station grün.' };
}

/** "Was das für dich bedeutet" text, by band. */
export function summarize(score: number, findings: Finding[]): { sub: string } {
	const band = bandFor(score);
	const todo = findings.filter((f) => f.status === 'bad' || (f.status === 'warn' && (f.gain ?? 0) > 0));
	const sub: Record<Band, string> = {
		good: todo.length ? 'Deine Mails kommen an. Mit dem Feinschliff unten bist du auf der sicheren Seite.' : 'Deine Mails kommen an, und deine Domain ist sauber eingerichtet. Mehr geht nicht.',
		solid: 'Deine Mails kommen meistens an. Mit den Punkten unten wird es verlässlicher, besonders bei Gmail und Outlook.',
		endangered: 'Ein Teil deiner Mails landet wahrscheinlich im Spam. Arbeite die Punkte unten der Reihe nach ab, der erste bringt am meisten.',
		risk: 'Viele deiner Mails landen im Spam oder werden abgelehnt. Erst beheben, dann wieder versenden.',
	};
	// The exception rule (hasAuthFailure) is shown as its own notice in the UI, not repeated here.
	return { sub: sub[band] };
}
