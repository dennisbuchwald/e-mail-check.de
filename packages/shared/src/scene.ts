// What the result scene ("Der Weg deiner Mail" on the result page) needs to replay one mail:
// a state per station and a few details for the objects (labels, broken seal, hard stops).
import type { Station } from './stations.ts';
import type { Finding, Status } from './types.ts';

export interface SceneDetails {
	/** Label on the laptop display for an SPF hint: "@" freemail sender, "~" softfail. */
	spfGlyph?: '@' | '~';
	/** DKIM signature present but invalid: the seal breaks (missing signature: no seal at all). */
	dkimBroken?: boolean;
	/** DMARC fail: the barrier stays down, the journey stops there. */
	dmarcFail?: boolean;
	/** The spam filter says spam (rspamd ≥ 6): the envelope falls into the spam tray. */
	spam?: boolean;
	/** No TLS at all (scored as a hint, drawn as an open tube); old TLS gets a dashed segment. */
	noTls?: boolean;
	/** Blocklists that list the server, for labels outside the drawing. */
	lists?: string[];
}

const raw = (fs: Finding[], id: string) => (fs.find((f) => f.id === id)?.raw ?? {}) as Record<string, unknown>;

export function sceneConfig(stations: Station[]): { states: Status[]; details: SceneDetails } {
	const all = stations.flatMap((s) => s.findings);
	const details: SceneDetails = {};
	const sender = all.find((f) => f.id === 'sender');
	if (sender?.status === 'warn' && raw(all, 'sender').freemail) details.spfGlyph = '@';
	else if (raw(all, 'spf').result === 'softfail') details.spfGlyph = '~';
	const sigs = (raw(all, 'dkim').signatures ?? []) as { result?: string }[];
	if (sigs.length && sigs.every((s) => s.result !== 'pass')) details.dkimBroken = true;
	if (raw(all, 'dmarc').result === 'fail') details.dmarcFail = true;
	const score = raw(all, 'content').rspamdScore;
	if (typeof score === 'number' && score >= 6) details.spam = true;
	const tls = raw(all, 'transport').tls as { used?: boolean } | undefined;
	if (tls && tls.used === false) details.noTls = true;
	const lists = ((raw(all, 'reputation').lists ?? []) as { list: string; listed?: boolean | null }[]).filter((l) => l.listed).map((l) => l.list);
	if (lists.length) details.lists = lists;
	return { states: stations.map((s) => s.status), details };
}

/** "Station 3 Schutzregel: Problem" for the station buttons. */
export const STATE_WORD: Record<Status, string> = { ok: 'in Ordnung', warn: 'Hinweis', bad: 'Problem', skip: 'nicht geprüft' };
