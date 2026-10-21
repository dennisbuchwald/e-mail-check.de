import { Resolver } from 'node:dns/promises';

/** Same signature as dns.promises.resolve, which is what mailauth expects. */
export type DnsResolver = (name: string, rrtype: string) => Promise<any>;

export function createResolver(servers: string[]): DnsResolver {
	const resolver = new Resolver({ timeout: 3000, tries: 2 });
	if (servers.length > 0) resolver.setServers(servers);
	return (name, rrtype) => resolver.resolve(name, rrtype);
}

/** Error codes that mean "the name has no such record", not a lookup failure. */
export function isNotFound(err: unknown): boolean {
	const code = (err as { code?: string })?.code;
	return code === 'ENOTFOUND' || code === 'ENODATA' || code === 'NXDOMAIN';
}

/** TXT records joined per record, as strings. */
export async function resolveTxt(resolve: DnsResolver, name: string): Promise<string[]> {
	try {
		const rows: string[][] = await resolve(name, 'TXT');
		return rows.map((parts) => parts.join(''));
	} catch (err) {
		if (isNotFound(err)) return [];
		throw err;
	}
}
