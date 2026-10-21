// Persistence: only test addresses and result summaries. Never message content.
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { MailResult, TestState } from '@emc/shared';

export interface TestRow {
	id: string;
	local: string;
	state: TestState;
	resultId: string | null;
	createdAt: string;
	expiresAt: string;
}

export class Store {
	private db: DatabaseSync;

	constructor(path: string) {
		if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
		this.db = new DatabaseSync(path);
		this.db.exec(`
			PRAGMA journal_mode = WAL;
			CREATE TABLE IF NOT EXISTS tests (
				id TEXT PRIMARY KEY,
				local TEXT NOT NULL UNIQUE,
				state TEXT NOT NULL,
				result_id TEXT,
				created_at TEXT NOT NULL,
				expires_at TEXT NOT NULL
			);
			CREATE TABLE IF NOT EXISTS results (
				id TEXT PRIMARY KEY,
				json TEXT NOT NULL,
				expires_at TEXT NOT NULL
			);
		`);
	}

	createTest(row: Omit<TestRow, 'state' | 'resultId'>): void {
		this.db.prepare('INSERT INTO tests (id, local, state, created_at, expires_at) VALUES (?, ?, ?, ?, ?)').run(row.id, row.local, 'waiting', row.createdAt, row.expiresAt);
	}

	/** Number of analyzed tests created at or after `sinceIso` (for the public counter). */
	countDoneSince(sinceIso: string): number {
		const row = this.db.prepare("SELECT COUNT(*) AS n FROM tests WHERE state = 'done' AND created_at >= ?").get(sinceIso) as { n: number };
		return Number(row.n);
	}

	getTest(id: string): TestRow | undefined {
		return toTest(this.db.prepare('SELECT * FROM tests WHERE id = ?').get(id));
	}

	getTestByLocal(local: string): TestRow | undefined {
		return toTest(this.db.prepare('SELECT * FROM tests WHERE local = ?').get(local));
	}

	setTestState(id: string, state: TestState, resultId: string | null = null): void {
		this.db.prepare('UPDATE tests SET state = ?, result_id = COALESCE(?, result_id) WHERE id = ?').run(state, resultId, id);
	}

	saveResult(result: MailResult): void {
		this.db.prepare('INSERT INTO results (id, json, expires_at) VALUES (?, ?, ?)').run(result.id, JSON.stringify(result), result.expiresAt);
	}

	getResult(id: string, now = new Date()): MailResult | undefined {
		const row = this.db.prepare('SELECT json FROM results WHERE id = ? AND expires_at > ?').get(id, now.toISOString()) as { json: string } | undefined;
		return row ? (JSON.parse(row.json) as MailResult) : undefined;
	}

	/** Deletes expired results and old test addresses. Returns number of deleted rows. */
	purge(now = new Date(), keepTestsDays = 7): number {
		const iso = now.toISOString();
		const r = this.db.prepare('DELETE FROM results WHERE expires_at <= ?').run(iso);
		const cutoff = new Date(now.getTime() - keepTestsDays * 86400_000).toISOString();
		const t = this.db.prepare('DELETE FROM tests WHERE created_at <= ?').run(cutoff);
		return Number(r.changes) + Number(t.changes);
	}

	close(): void {
		this.db.close();
	}
}

function toTest(row: unknown): TestRow | undefined {
	if (!row) return undefined;
	const r = row as Record<string, string | null>;
	return { id: r.id!, local: r.local!, state: r.state as TestState, resultId: r.result_id, createdAt: r.created_at!, expiresAt: r.expires_at! };
}
