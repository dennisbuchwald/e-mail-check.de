// Guide steps for the in-tool guide, fetched lazily by tool.ts.
import { getCollection } from 'astro:content';
import { PROVIDERS, guideUrl } from '../data/site';

export async function GET() {
	const entries = await getCollection('anleitung');
	const out: Record<string, { name: string; url: Record<string, string>; schritte: Record<string, unknown> }> = {};
	for (const p of PROVIDERS) out[p.slug] = { name: p.name, url: {}, schritte: {} };
	for (const e of entries) {
		const g = out[e.data.anbieter];
		for (const t of e.data.themen) {
			g.url[t] = guideUrl(e.data.anbieter, t);
			const steps = e.data.schritte[t];
			if (steps?.length) g.schritte[t] = steps;
		}
	}
	return new Response(JSON.stringify(out), { headers: { 'Content-Type': 'application/json' } });
}
