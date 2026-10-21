// Result page V2: the delivery route with six stations (design/redesign/ergebnis-v2-prototyp.html, tab D).
// Each station groups one or two findings; its status is the worst of them.
import { round1 } from './scoring.ts';
import type { CheckId, Finding, Status } from './types.ts';

export type StationId = 'absender' | 'unterschrift' | 'schutzregel' | 'serverruf' | 'transport' | 'posteingang';

export const STATION_DEFS: { id: StationId; title: string; checks: CheckId[] }[] = [
	{ id: 'absender', title: 'Absender', checks: ['spf', 'sender'] },
	{ id: 'unterschrift', title: 'Unterschrift', checks: ['dkim'] },
	{ id: 'schutzregel', title: 'Schutzregel', checks: ['dmarc'] },
	{ id: 'serverruf', title: 'Server-Ruf', checks: ['reputation'] },
	{ id: 'transport', title: 'Transport', checks: ['transport'] },
	{ id: 'posteingang', title: 'Posteingang', checks: ['content'] },
];

export interface Station {
	id: StationId;
	index: number;
	title: string;
	status: Status;
	findings: Finding[];
	/** Points gained by fixing everything at this station. */
	gain: number;
}

const RANK: Record<Status, number> = { bad: 3, warn: 2, ok: 1, skip: 0 };

export function stationsOf(findings: Finding[]): Station[] {
	return STATION_DEFS.map((def, index) => {
		const fs = def.checks.map((id) => findings.find((f) => f.id === id)).filter((f): f is Finding => !!f);
		const checked = fs.filter((f) => f.status !== 'skip');
		const status: Status = checked.length ? checked.reduce<Status>((w, f) => (RANK[f.status] > RANK[w] ? f.status : w), 'ok') : 'skip';
		const gain = round1(fs.reduce((s, f) => s + f.deductions.reduce((x, d) => x + d.points, 0), 0));
		return { id: def.id, index, title: def.title, status, findings: fs, gain };
	});
}

/** Station opened on load: first problem, else first hint, else station 1. */
export function initialStation(stations: Station[]): number {
	const bad = stations.findIndex((s) => s.status === 'bad');
	if (bad >= 0) return bad;
	const warn = stations.findIndex((s) => s.status === 'warn');
	return warn >= 0 ? warn : 0;
}
