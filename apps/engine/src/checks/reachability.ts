// Can replies (to the From domain) and bounces (to the Return-Path domain) be delivered at all?
// A domain needs an MX record; an A/AAAA record works as an implicit fallback (RFC 5321 5.1).
// A "null MX" (RFC 7505: one MX "." with priority 0) says outright that the domain takes no mail.
import type { Reach } from '@emc/shared';
import { isNotFound, type DnsResolver } from '../dns.ts';

async function has(resolve: DnsResolver, name: string, type: string): Promise<unknown[] | null> {
	try {
		return (await resolve(name, type)) as unknown[];
	} catch (err) {
		if (isNotFound(err)) return [];
		return null;
	}
}

/** mx: proper MX · a: only A/AAAA (works, not recommended) · none: no mail possible · null: lookup failed. */
export async function reachOf(domain: string, resolve: DnsResolver): Promise<Reach> {
	const mx = (await has(resolve, domain, 'MX')) as { exchange: string; priority: number }[] | null;
	if (mx === null) return null;
	if (mx.length === 1 && mx[0].exchange.replace(/\.$/, '') === '') return 'none';
	if (mx.length) return 'mx';
	const [a, aaaa] = await Promise.all([has(resolve, domain, 'A'), has(resolve, domain, 'AAAA')]);
	if (a === null && aaaa === null) return null;
	return a?.length || aaaa?.length ? 'a' : 'none';
}
