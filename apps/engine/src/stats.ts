// Public "tests today" counter for the status bar. Only a real number, never a made-up one.
const TZ = 'Europe/Berlin';

/** Offset of Europe/Berlin to UTC at the given moment, in minutes (60 or 120). */
function berlinOffset(d: Date): number {
	const name = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'longOffset' }).formatToParts(d).find((p) => p.type === 'timeZoneName')!.value;
	const m = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
	return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
}

/** 00:00 of the current day in Europe/Berlin, as a UTC instant. Correct on DST switch days. */
export function berlinMidnight(now: Date): Date {
	const day = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
	const utcMidnight = new Date(`${day}T00:00:00Z`).getTime();
	let t = utcMidnight - berlinOffset(new Date(utcMidnight)) * 60_000;
	const again = berlinOffset(new Date(t));
	t = utcMidnight - again * 60_000;
	return new Date(t);
}

export interface TestsTodayOptions {
	/** Counts finished tests created at or after the given ISO time. */
	count: (sinceIso: string) => number;
	now?: () => Date;
	ttlMs?: number;
	/** Below this the number is not shown at all. */
	min?: number;
}

/** Cached counter: hits the database at most once per ttl. Returns null below the threshold or on error. */
export class TestsToday {
	private cache: { at: number; value: number | null } | null = null;
	private readonly opts: TestsTodayOptions;

	constructor(opts: TestsTodayOptions) {
		this.opts = opts;
	}

	get(): number | null {
		const now = this.opts.now?.() ?? new Date();
		const ttl = this.opts.ttlMs ?? 60_000;
		if (this.cache && now.getTime() - this.cache.at < ttl) return this.cache.value;
		let value: number | null;
		try {
			const n = this.opts.count(berlinMidnight(now).toISOString());
			value = n >= (this.opts.min ?? 50) ? n : null;
		} catch {
			value = null;
		}
		this.cache = { at: now.getTime(), value };
		return value;
	}
}
