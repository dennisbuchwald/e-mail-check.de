// Result page V2: the delivery route with six stations.
// Each station groups one or two findings; its status is the worst of them.
import { round1, STATUS_RANK } from './scoring.ts';
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

const RANK = STATUS_RANK;

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

/** Names of the lists we really query (engine checks/reputation.ts; a test keeps both in sync). */
export const IP_BLOCKLIST_NAMES = ['Spamhaus ZEN', 'SpamCop', 'PSBL', 'Mailspike', 'Truncate (GBUdb)', 'NordSpam', 's5h.net', '0spam', 'DroneBL', 'blocklist.de'] as const;
export const ALLOW_LIST_NAMES = ['DNSWL', 'Mailspike Positivliste'] as const;
/** Link-domain lists, queried by rspamd. */
export const URI_BLOCKLIST_NAMES = ['Spamhaus DBL', 'SURBL', 'URIBL'] as const;
