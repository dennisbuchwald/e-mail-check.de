// Test lifecycle: create address → receive mail → analyze → result. Progress is pushed to subscribers.
import { EventEmitter } from 'node:events';
import { randomInt } from 'node:crypto';
import type { MailPreview, MailResult, ProgressEvent, TestStatus } from '@emc/shared';
import { analyzeMessage, newId, type AnalyzeDeps } from './analyze.ts';
import type { SmtpEnvelope } from './checks/auth.ts';
import type { Store } from './store.ts';
import { CheckedCounter } from './stats.ts';

// No 0/o/1/l/i: addresses get typed by hand sometimes.
const HEADER_TTL_MS = 3600_000;
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

export function newLocalPart(length = 8): string {
	let s = '';
	for (let i = 0; i < length; i++) s += ALPHABET[randomInt(ALPHABET.length)];
	return s;
}

export interface ServiceOptions {
	store: Store;
	deps: AnalyzeDeps;
	testDomain: string;
	testTtlMinutes: number;
	now?: () => Date;
}

export class TestService {
	private readonly opts: ServiceOptions;
	private readonly bus = new EventEmitter();
	/** Finished steps of running analyses; kept briefly for late subscribers and polling. */
	private readonly progress = new Map<string, Extract<ProgressEvent, { type: 'step' }>[]>();
	private readonly checked = new CheckedCounter({ count: () => this.opts.store.mailsChecked(), now: () => this.now() });
	private readonly headers = new Map<string, { from: string | null; subject: string | null }>();

	constructor(opts: ServiceOptions) {
		this.opts = opts;
		this.bus.setMaxListeners(1000);
	}

	private now(): Date {
		return this.opts.now?.() ?? new Date();
	}

	createTest(): TestStatus {
		const now = this.now();
		const id = newId();
		const local = newLocalPart();
		const expiresAt = new Date(now.getTime() + this.opts.testTtlMinutes * 60_000).toISOString();
		this.opts.store.createTest({ id, local, createdAt: now.toISOString(), expiresAt });
		return { id, address: `${local}@${this.opts.testDomain}`, state: 'waiting', done: [], resultId: null, expiresAt };
	}

	status(id: string): TestStatus | undefined {
		const t = this.opts.store.getTest(id);
		if (!t) return undefined;
		const expired = t.state === 'waiting' && t.expiresAt <= this.now().toISOString();
		return {
			id: t.id,
			address: `${t.local}@${this.opts.testDomain}`,
			state: expired ? 'expired' : t.state,
			done: t.state === 'done' ? ['received', 'spf', 'dkim', 'dmarc', 'reputation', 'content'] : (this.progress.get(t.id)?.map((e) => e.step) ?? []),
			resultId: t.resultId,
			expiresAt: t.expiresAt,
		};
	}

	/** Called during SMTP RCPT TO: only fresh, waiting addresses accept mail. */
	acceptsRecipient(address: string): boolean {
		const [local, domain] = address.toLowerCase().split('@');
		if (domain !== this.opts.testDomain.toLowerCase()) return false;
		const t = this.opts.store.getTestByLocal(local);
		return !!t && t.state === 'waiting' && t.expiresAt > this.now().toISOString();
	}

	/** Analyzes the message for one recipient. The buffer is not kept after this call. */
	async handleMessage(rcpt: string, message: Buffer, env: SmtpEnvelope): Promise<MailResult | undefined> {
		const t = this.opts.store.getTestByLocal(rcpt.toLowerCase().split('@')[0]);
		if (!t || t.state !== 'waiting') return undefined;
		this.opts.store.setTestState(t.id, 'analyzing');
		const steps: Extract<ProgressEvent, { type: 'step' }>[] = [];
		let preview: MailPreview | undefined;
		this.progress.set(t.id, steps);
		try {
			const result = await analyzeMessage(message, env, rcpt, this.opts.deps, (step, info) => {
				const e = { type: 'step' as const, step, ...info };
				steps.push(e);
				this.emit(t.id, e);
			}, (p) => (preview = p));
			// Subject and From address are mail content: they stay in RAM for one hour for
			// the person who just ran the test and never reach the database.
			this.opts.store.saveResult({ ...result, mail: { ...result.mail, from: null, subject: null } });
			this.headers.set(result.id, { from: result.mail.from, subject: result.mail.subject });
			setTimeout(() => this.headers.delete(result.id), HEADER_TTL_MS).unref();
			this.opts.store.setTestState(t.id, 'done', result.id);
			// The preview goes out once, live; a later subscriber or the share link never gets it.
			this.emit(t.id, { type: 'done', resultId: result.id, ...(preview ? { preview } : {}) });
			preview = undefined;
			return result;
		} catch (err) {
			this.opts.store.setTestState(t.id, 'error');
			this.emit(t.id, { type: 'error', message: 'Die Auswertung ist fehlgeschlagen. Bitte starte einen neuen Test.' });
			console.error('analysis failed', (err as Error).message);
			return undefined;
		} finally {
			setTimeout(() => this.progress.delete(t.id), 60_000).unref();
		}
	}

	result(id: string): MailResult | undefined {
		const r = this.opts.store.getResult(id, this.now());
		const h = r && this.headers.get(id);
		return r && h ? { ...r, mail: { ...r.mail, ...h } } : r;
	}

	/** All-time number of analyzed mails, or null below 100 (see stats.ts). */
	mailsChecked(): number | null {
		return this.checked.get();
	}

	/** Finished steps with their live extras, for replaying to late subscribers. */
	stepEvents(id: string): Extract<ProgressEvent, { type: 'step' }>[] {
		return this.progress.get(id) ?? [];
	}

	subscribe(id: string, fn: (e: ProgressEvent) => void): () => void {
		this.bus.on(id, fn);
		return () => this.bus.off(id, fn);
	}

	private emit(id: string, e: ProgressEvent): void {
		this.bus.emit(id, e);
	}
}
