// Freemail providers (packages/shared/src/freemail.json): a sender domain from this list gets a hint.
import data from './freemail.json' with { type: 'json' };

const DOMAINS = new Set(data.domains.map((d) => d.toLowerCase()));

export function isFreemail(domain: string | null | undefined): boolean {
	return !!domain && DOMAINS.has(domain.toLowerCase().replace(/\.$/, ''));
}
