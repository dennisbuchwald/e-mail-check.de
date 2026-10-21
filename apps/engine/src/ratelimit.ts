// Sliding-window rate limit per key, in memory (single process).
export class RateLimiter {
	private hits = new Map<string, number[]>();
	private readonly limit: number;
	private readonly windowMs: number;

	constructor(limit: number, windowMs: number) {
		this.limit = limit;
		this.windowMs = windowMs;
	}

	/** Records a hit; returns seconds to wait if over the limit, else 0. */
	hit(key: string, now = Date.now()): number {
		const recent = (this.hits.get(key) ?? []).filter((t) => t > now - this.windowMs);
		if (recent.length >= this.limit) {
			this.hits.set(key, recent);
			return Math.ceil((recent[0] + this.windowMs - now) / 1000);
		}
		recent.push(now);
		this.hits.set(key, recent);
		return 0;
	}

	sweep(now = Date.now()): void {
		for (const [key, times] of this.hits) {
			if (times.every((t) => t <= now - this.windowMs)) this.hits.delete(key);
		}
	}
}
