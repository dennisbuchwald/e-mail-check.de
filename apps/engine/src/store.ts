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

	constructor(path: string, opts: { mailsCheckedSeed?: number } = {}) {
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
			CREATE TABLE IF NOT EXISTS counters (
				name TEXT PRIMARY KEY,
				value INTEGER NOT NULL
			);
		`);
		// All-time number of analyzed mails. Test rows are deleted after 7 days, so the total lives
		// in its own row; the first start seeds it with the analyzed tests that still exist.
		this.db
			.prepare("INSERT OR IGNORE INTO counters (name, value) SELECT 'mails_checked', COUNT(*) FROM tests WHERE state = 'done'")
			.run();
		// Restore after a lost volume: the backed-up value (scripts/deploy.sh) never lowers the counter.
		if (opts.mailsCheckedSeed) this.db.prepare("UPDATE counters SET value = MAX(value, ?) WHERE name = 'mails_checked'").run(opts.mailsCheckedSeed);
	}

	createTest(row: Omit<TestRow, 'state' | 'resultId'>): void {
		this.db.prepare('INSERT INTO tests (id, local, state, created_at, expires_at) VALUES (?, ?, ?, ?, ?)').run(row.id, row.local, 'waiting', row.createdAt, row.expiresAt);
	}

	/** All-time number of analyzed mails (one number, no personal data). */
	mailsChecked(): number {
		const row = this.db.prepare("SELECT value FROM counters WHERE name = 'mails_checked'").get() as { value: number } | undefined;
		return Number(row?.value ?? 0);
	}

	getTest(id: string): TestRow | undefined {
		return toTest(this.db.prepare('SELECT * FROM tests WHERE id = ?').get(id));
	}

	getTestByLocal(local: string): TestRow | undefined {
		return toTest(this.db.prepare('SELECT * FROM tests WHERE local = ?').get(local));
	}

	setTestState(id: string, state: TestState, resultId: string | null = null): void {
		const changed = this.db.prepare("UPDATE tests SET state = ?, result_id = COALESCE(?, result_id) WHERE id = ? AND state <> 'done'").run(state, resultId, id);
		if (state === 'done' && Number(changed.changes) > 0) this.db.prepare("UPDATE counters SET value = value + 1 WHERE name = 'mails_checked'").run();
	}

	/** Tests still "analyzing" from before a restart can never finish: mark them failed. */
	failStaleTests(): number {
		return Number(this.db.prepare("UPDATE tests SET state = 'error' WHERE state = 'analyzing'").run().changes);
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
