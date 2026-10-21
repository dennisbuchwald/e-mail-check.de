import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DnsResolver } from '../src/dns.ts';

export const FIXTURES = join(import.meta.dirname, 'fixtures');
export const GOOD_IP = '203.0.113.10';
export const LISTED_IP = '203.0.113.66';

export function fixture(name: string): Buffer {
	return readFileSync(join(FIXTURES, name));
}

/** Resolver backed by test/fixtures/dns.json; unknown names behave like NXDOMAIN. */
export function fakeResolver(extra: Record<string, unknown> = {}): DnsResolver {
	const zone = { ...JSON.parse(readFileSync(join(FIXTURES, 'dns.json'), 'utf8')), ...extra } as Record<string, unknown>;
	return async (name, rrtype) => {
		const hit = zone[`${name.toLowerCase()} ${rrtype}`];
		if (hit === undefined) throw Object.assign(new Error(`queryTxt ENOTFOUND ${name}`), { code: 'ENOTFOUND' });
		return hit;
	};
}
