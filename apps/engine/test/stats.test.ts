import { describe, expect, it } from 'vitest';
import { CheckedCounter } from '../src/stats.ts';
import { Store } from '../src/store.ts';

describe('CheckedCounter', () => {
	it('hides numbers below 100 and shows real ones from 100', () => {
		let n = 99;
		const c = new CheckedCounter({ count: () => n, ttlMs: 0 });
		expect(c.get()).toBeNull();
		n = 100;
		expect(c.get()).toBe(100);
	});

	it('reads the database at most once per minute', () => {
		let calls = 0;
		let now = new Date('2026-10-21T10:00:00Z');
		const c = new CheckedCounter({ count: () => (calls++, 120), now: () => now });
		expect(c.get()).toBe(120);
		now = new Date('2026-10-21T10:00:59Z');
		c.get();
		expect(calls).toBe(1);
		now = new Date('2026-10-21T10:01:00Z');
		c.get();
		expect(calls).toBe(2);
	});

	it('returns null on errors', () => {
		expect(new CheckedCounter({ count: () => { throw new Error('db'); } }).get()).toBeNull();
	});
});

describe('Store mails_checked', () => {
	const row = (id: string, local: string) => ({ id, local, createdAt: '2026-10-01T10:00:00.000Z', expiresAt: '2026-10-01T11:00:00.000Z' });

	it('counts each analyzed mail once and keeps the total after old tests are purged', () => {
		const s = new Store(':memory:');
		s.createTest(row('a'.repeat(22), 'aaaaaaaa'));
		s.createTest(row('b'.repeat(22), 'bbbbbbbb'));
		s.setTestState('a'.repeat(22), 'analyzing');
		s.setTestState('a'.repeat(22), 'done', 'r1');
		s.setTestState('a'.repeat(22), 'done', 'r1'); // repeated: no double count
		s.setTestState('b'.repeat(22), 'error');
		expect(s.mailsChecked()).toBe(1);
		s.purge(new Date('2026-12-01T00:00:00Z'));
		expect(s.getTest('a'.repeat(22))).toBeUndefined();
		expect(s.mailsChecked()).toBe(1);
	});
});
