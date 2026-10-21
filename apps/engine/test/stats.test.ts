import { describe, expect, it } from 'vitest';
import { berlinMidnight, TestsToday } from '../src/stats.ts';

describe('berlinMidnight', () => {
	it('uses UTC+2 in summer and UTC+1 in winter', () => {
		expect(berlinMidnight(new Date('2026-07-15T10:00:00Z')).toISOString()).toBe('2026-07-14T22:00:00.000Z');
		expect(berlinMidnight(new Date('2026-12-15T10:00:00Z')).toISOString()).toBe('2026-12-14T23:00:00.000Z');
	});

	it('takes the Berlin date, not the UTC date, right after midnight', () => {
		// 23:30 UTC on 21.10. is already 01:30 on 22.10. in Berlin.
		expect(berlinMidnight(new Date('2026-10-21T23:30:00Z')).toISOString()).toBe('2026-10-21T22:00:00.000Z');
	});

	it('is correct on DST switch days', () => {
		// 25.10.2026 clocks go back at 03:00: midnight was still summer time.
		expect(berlinMidnight(new Date('2026-10-25T12:00:00Z')).toISOString()).toBe('2026-10-24T22:00:00.000Z');
		// 29.03.2026 clocks go forward at 02:00: midnight was still winter time.
		expect(berlinMidnight(new Date('2026-03-29T12:00:00Z')).toISOString()).toBe('2026-03-28T23:00:00.000Z');
	});
});

describe('TestsToday', () => {
	it('hides numbers below 50 and shows real ones from 50', () => {
		let n = 49;
		const t = new TestsToday({ count: () => n, ttlMs: 0 });
		expect(t.get()).toBeNull();
		n = 50;
		expect(t.get()).toBe(50);
	});

	it('queries the database at most once per minute', () => {
		let calls = 0;
		let now = new Date('2026-10-21T10:00:00Z');
		const t = new TestsToday({ count: () => (calls++, 120), now: () => now });
		expect(t.get()).toBe(120);
		now = new Date('2026-10-21T10:00:59Z');
		t.get();
		expect(calls).toBe(1);
		now = new Date('2026-10-21T10:01:00Z');
		t.get();
		expect(calls).toBe(2);
	});

	it('counts from Berlin midnight and returns null on errors', () => {
		let since = '';
		new TestsToday({ count: (s) => ((since = s), 80), now: () => new Date('2026-10-21T08:00:00Z') }).get();
		expect(since).toBe('2026-10-20T22:00:00.000Z');
		expect(new TestsToday({ count: () => { throw new Error('db'); } }).get()).toBeNull();
	});
});
