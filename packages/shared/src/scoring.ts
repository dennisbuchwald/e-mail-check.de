// Score model. Every point value lives here and is documented in docs/scoring.md.
import type { Band, Finding, Impact, SubScores } from './types.ts';

export const POINTS = {
	spf: { none: 1.5, fail: 2, softfail: 1, neutral: 0.5, permerror: 1.5, temperror: 0.5 },
	dkim: { none: 2, fail: 2.5, notAligned: 0.5, temperror: 0.5 },
	dmarc: { none: 1.5, fail: 2.5, monitorOnly: 0.2, temperror: 0.5 },
	reputation: { majorList: 3, otherList: 1, listCap: 4, noPtr: 1, ptrMismatch: 0.5 },
	content: { cap: 4, deadLink: 0.5, deadLinkCap: 1, shortener: 0.5, noUnsubscribeHeader: 0.5 },
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

const ORDER = { bad: 0, warn: 1, ok: 2, skip: 3 } as const;

export function sortFindings<T extends Pick<Finding, 'status'>>(findings: T[]): T[] {
	return findings.slice().sort((a, b) => ORDER[a.status] - ORDER[b.status]);
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
	if (score < 5 || findings.some((f) => f.status === 'bad')) return 'bad';
	if (score < 7 || hasAuthFailure(findings)) return 'warn';
	if (score < 9 || findings.some((f) => f.status === 'warn')) return 'warn';
	return 'ok';
}

/** Highest possible deduction per area, used to turn deductions into a percentage. */
export const AREA_MAX = {
	auth: POINTS.spf.fail + POINTS.dkim.fail + POINTS.dmarc.fail,
	reputation: POINTS.reputation.listCap + POINTS.reputation.noPtr,
	content: POINTS.content.cap + POINTS.content.deadLinkCap + POINTS.content.shortener + POINTS.content.noUnsubscribeHeader,
} as const;

export function subScores(findings: Finding[]): SubScores {
	const area = (ids: string[], max: number): number | null => {
		const fs = findings.filter((f) => ids.includes(f.id));
		if (fs.length === 0 || fs.every((f) => f.status === 'skip')) return null;
		const ded = fs.reduce((s, f) => s + f.deductions.reduce((x, d) => x + d.points, 0), 0);
		return Math.max(0, Math.round(100 * (1 - ded / max)));
	};
	return { auth: area([...AUTH_IDS], AREA_MAX.auth), reputation: area(['reputation'], AREA_MAX.reputation), content: area(['content'], AREA_MAX.content) };
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
	return enriched.sort((a, b) => ORDER[a.status] - ORDER[b.status] || (b.gain ?? 0) - (a.gain ?? 0));
}

/** Verdict headline and "what this means" text. */
export function summarize(score: number, findings: Finding[]): { headline: string; sub: string } {
	const band = bandFor(score);
	const todo = findings.filter((f) => f.status === 'bad' || (f.status === 'warn' && (f.gain ?? 0) > 0));
	let headline: string;
	if (todo.length === 0) headline = band === 'good' ? 'Alles im grünen Bereich.' : 'Solide. Mehr geht hier kaum.';
	else if (band === 'risk') headline = 'Hier landet viel im Spam. So behebst du es.';
	else if (todo.length === 1) headline = 'Fast geschafft. Eine Sache hält dich von der 10 ab.';
	else headline = `${todo.length === 2 ? 'Zwei' : todo.length === 3 ? 'Drei' : todo.length === 4 ? 'Vier' : 'Fünf'} Dinge halten dich von der 10 ab.`;
	const sub: Record<Band, string> = {
		good: todo.length ? 'Deine Mails kommen an. Mit dem Feinschliff unten bist du auf der sicheren Seite.' : 'Deine Mails kommen an, und deine Domain ist sauber eingerichtet. Mehr geht nicht.',
		solid: 'Deine Mails kommen meistens an. Mit den Punkten unten wird es verlässlicher, besonders bei Gmail und Outlook.',
		endangered: 'Ein Teil deiner Mails landet wahrscheinlich im Spam. Arbeite die Punkte unten der Reihe nach ab, der erste bringt am meisten.',
		risk: 'Viele deiner Mails landen im Spam oder werden abgelehnt. Erst beheben, dann wieder versenden.',
	};
	// The exception rule (hasAuthFailure) is shown as its own notice in the UI, not repeated here.
	return { headline, sub: sub[band] };
}
