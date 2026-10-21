// Score model. Every point value lives here and is documented in docs/scoring.md.
import type { Finding } from './types.ts';

export const POINTS = {
	spf: { none: 1.5, fail: 2, softfail: 1, neutral: 0.5, permerror: 1.5, temperror: 0.5, notAligned: 0 },
	dkim: { none: 2, fail: 2.5, notAligned: 0.5, weakKey: 0.5 },
	dmarc: { none: 1.5, fail: 2.5, monitorOnly: 0.2, temperror: 0.5 },
	reputation: { majorList: 3, otherList: 1, listCap: 4, noPtr: 1, ptrMismatch: 0.5 },
	content: { cap: 4 },
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

export function trafficLight(score: number, findings: Pick<Finding, 'status'>[]): 'ok' | 'warn' | 'bad' {
	if (score < 5 || findings.some((f) => f.status === 'bad')) return 'bad';
	if (score < 8) return 'warn';
	return 'ok';
}

export function summarize(score: number, findings: Finding[]): { headline: string; sub: string } {
	const bad = findings.filter((f) => f.status === 'bad');
	const warn = findings.filter((f) => f.status === 'warn');
	if (bad.length > 0) {
		const headline = bad.length === 1 ? '1 Problem gefunden' : `${bad.length} Probleme gefunden`;
		const first = bad[0];
		const sub = first.guide
			? `${first.title}: Das lässt sich in wenigen Minuten beheben. Die Anleitung steht beim Prüfpunkt.`
			: `${first.title}. Was du tun kannst, steht beim Prüfpunkt.`;
		return { headline, sub };
	}
	if (warn.length > 0 || score < 9.5) {
		return {
			headline: 'Deine Mails kommen an',
			sub: warn.length === 1 ? 'Alles Wichtige passt. Einen kleinen Tipp findest du unten.' : `Alles Wichtige passt. ${warn.length} kleine Tipps findest du unten.`,
		};
	}
	return { headline: 'Alles perfekt', sub: 'Deine Mail ist sauber eingerichtet. Mehr geht nicht.' };
}
