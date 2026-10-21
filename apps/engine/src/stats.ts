// Public "mails checked" counter for the status bar. Only a real number, never a made-up one.

export interface CheckedCounterOptions {
	/** Reads the all-time number of analyzed mails. */
	count: () => number;
	now?: () => Date;
	ttlMs?: number;
	/** Below this the number is not shown at all. */
	min?: number;
}

/** Cached counter: reads the database at most once per ttl. Returns null below the threshold or on error. */
export class CheckedCounter {
	private cache: { at: number; value: number | null } | null = null;
	private readonly opts: CheckedCounterOptions;

	constructor(opts: CheckedCounterOptions) {
		this.opts = opts;
	}

	get(): number | null {
		const now = (this.opts.now?.() ?? new Date()).getTime();
		if (this.cache && now - this.cache.at < (this.opts.ttlMs ?? 60_000)) return this.cache.value;
		let value: number | null;
		try {
			const n = this.opts.count();
			value = n >= (this.opts.min ?? 100) ? n : null;
		} catch {
			value = null;
		}
		this.cache = { at: now, value };
		return value;
	}
}
