// /llms-full.txt: full Markdown text of all knowledge and guide pages in one file, for AI agents.
import { getCollection } from 'astro:content';
import { PROVIDERS, SITE } from '../data/site';

type Faq = { frage: string; antwort: string }[];
type Quelle = { titel: string; url: string }[];

/** Body headings move down one level, so every page can sit under its own H2. */
const shift = (md = '') => md.trim().replace(/^(#{1,5}) /gm, '#$1 ');

const faqBlock = (faq: Faq) =>
	faq.length ? `\n\n### Häufige Fragen\n\n${faq.map((f) => `**${f.frage}**\n${f.antwort}`).join('\n\n')}` : '';

const quellenBlock = (q: Quelle) => (q.length ? `\n\n### Quellen\n\n${q.map((x) => `- [${x.titel}](${x.url})`).join('\n')}` : '');

export async function GET() {
	const wissen = (await getCollection('wissen')).sort((a, b) => a.data.reihenfolge - b.data.reihenfolge);
	const order = PROVIDERS.map((p) => p.slug as string);
	const anleitungen = (await getCollection('anleitung')).sort(
		(a, b) => order.indexOf(a.data.anbieter) - order.indexOf(b.data.anbieter) || a.id.localeCompare(b.id),
	);

	const wissenText = wissen.map((e) => {
		const d = e.data;
		return `## ${d.titel}

URL: ${SITE.url}/wissen/${e.id}
Stand: ${d.stand}

${d.kurz}

${shift(e.body)}${faqBlock(d.faq)}${quellenBlock(d.quelle)}`;
	});

	const anleitungText = anleitungen.map((e) => {
		const d = e.data;
		const pruefung = d.geprueft
			? 'gegen die Oberfläche des Anbieters geprüft'
			: 'noch nicht gegen die Oberfläche des Anbieters geprüft, Menüpfade können abweichen';
		return `## ${d.titel}

URL: ${SITE.url}/anleitung/${e.id}
Anbieter: ${d.anbieterName} · Themen: ${d.themen.map((t) => t.toUpperCase()).join(', ')} · Dauer: ${d.dauer}
Stand: ${d.stand} (${pruefung})

${d.kurzantwort}

${shift(e.body)}${faqBlock(d.faq)}${quellenBlock(d.quelle)}`;
	});

	const text = `# ${SITE.name}: vollständiger Text

> Alle Wissens- und Anleitungsseiten von ${SITE.name} in einer Datei. ${SITE.name} ist ein kostenloser deutscher Mail-Tester (Score 0 bis 10, Server in Deutschland, Mail-Inhalt wird sofort gelöscht). Übersicht: ${SITE.url}/llms.txt. In DNS-Werten steht deine-domain.de als Platzhalter für die eigene Domain.

# Wissen

${wissenText.join('\n\n---\n\n')}

# Anleitungen

${anleitungText.join('\n\n---\n\n')}
`;

	return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
