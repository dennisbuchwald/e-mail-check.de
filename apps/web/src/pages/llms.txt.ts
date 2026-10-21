// /llms.txt (llmstxt.org): index of the site for AI agents, built from the content collections.
import { getCollection } from 'astro:content';
import { PROVIDERS, SITE } from '../data/site';

const abs = (path: string) => (path === "/" ? SITE.url : `${SITE.url}${path}`);

export async function GET() {
	const wissen = (await getCollection('wissen')).sort((a, b) => a.data.reihenfolge - b.data.reihenfolge);
	const seiten = new Map((await getCollection('seiten')).map((s) => [s.id, s.data]));
	const anleitungen = await getCollection('anleitung');

	const tool = (path: string, id: string, fallback: string) => {
		const s = seiten.get(id);
		return `- [${s?.titel ?? fallback}](${abs(path)}): ${s?.beschreibung ?? fallback}`;
	};

	const guideSections = PROVIDERS.map((p) => {
		const items = anleitungen
			.filter((e) => e.data.anbieter === p.slug)
			.sort((a, b) => a.id.localeCompare(b.id))
			.map((e) => {
				const pruefung = e.data.geprueft ? '' : ' (noch nicht gegen die Oberfläche des Anbieters geprüft)';
				return `- [${e.data.titel}](${abs(`/anleitung/${e.id}`)}): ${e.data.beschreibung}${pruefung}`;
			});
		return items.length ? `## Anleitungen: ${p.name}\n\n${items.join('\n')}` : '';
	}).filter(Boolean);

	const text = `# ${SITE.name}

> ${SITE.name} ist ein deutscher, kostenloser Mail-Tester für Nicht-Techniker: Webdesigner, Agenturen und Selbstständige, die Postfächer und Websites für Kunden einrichten. Man schickt eine Testmail an eine einmalige Adresse und bekommt nach rund 30 Sekunden einen Score von 0 bis 10, eine Ampel und Klartext-Anleitungen für den eigenen Anbieter. Kostenlos, ohne Konto und ohne Tageslimit (nur ein Missbrauchsschutz pro IP). Server in Deutschland, der Mail-Inhalt wird direkt nach der Prüfung gelöscht, gespeichert wird nur die Zusammenfassung für 7 Tage.

So funktioniert der Mail-Test:

1. Auf ${SITE.url} eine einmalige Testadresse holen (Form: \`k7m2x9qa@test.e-mail-check.de\`).
2. Vom eigenen Postfach, Kontaktformular oder Newsletter-Tool eine normale Mail an diese Adresse schicken.
3. Die Seite zeigt das Ergebnis automatisch, mit teilbarem Link (7 Tage gültig, nicht indexiert).

Fünf Prüfpunkte: Absender bestätigt (SPF), Mail unterschrieben (DKIM), Schutzregel (DMARC), Server-Ruf (Sperrlisten wie Spamhaus, Reverse-DNS) und Inhalt (Spamfilter-Score mit rspamd, tote Links, Kurz-Links, Abmelde-Kopfzeile bei Newslettern).

Was der Score bedeutet:

- Jede Mail startet bei 10 Punkten, jeder Befund zieht Punkte ab, der Score wird auf eine Nachkommastelle gerundet.
- Beispiele für Abzüge: kein SPF-Eintrag 1,5; keine DKIM-Signatur 2; kein DMARC-Eintrag 1,5; DMARC mit p=none 0,2; Listung bei Spamhaus ZEN 3; kein PTR-Eintrag 1.
- Ampel: Rot bei mindestens einem Problem oder Score unter 5, Orange bei Score unter 8, sonst Grün. Ein einzelnes echtes Problem macht die Ampel rot, auch bei hohem Score.
- Die komplette Abzugstabelle steht öffentlich im Repo unter docs/scoring.md.

Ohne Testmail prüfen die DNS-Schnellchecks (SPF, DKIM, DMARC) eine Domain direkt. Der DKIM-Check sucht ohne Selektor automatisch nach verbreiteten Selektoren.

Der vollständige Text aller Wissens- und Anleitungsseiten steht in einer Datei unter ${SITE.url}/llms-full.txt.

## Tools

${tool('/', 'index', 'Mail-Tester')}
${tool('/spf-check', 'spf-check', 'SPF-Check')}
${tool('/dkim-check', 'dkim-check', 'DKIM-Check')}
${tool('/dmarc-check', 'dmarc-check', 'DMARC-Check')}
${tool('/mail-tester-alternative', 'mail-tester-alternative', 'Mail-Tester-Alternative')}

## Wissen

${wissen.map((e) => `- [${e.data.titel}](${abs(`/wissen/${e.id}`)}): ${e.data.beschreibung}`).join('\n')}

## Anleitungen

${tool('/anleitung', 'anleitung', 'Alle Anleitungen')}

${guideSections.join('\n\n')}

## Optional

- [Vollständiger Text aller Seiten](${abs('/llms-full.txt')}): Wissen und Anleitungen in einer Datei
- [Impressum](${abs('/impressum')})
- [Datenschutz](${abs('/datenschutz')})
- [Quellcode auf GitHub](https://github.com/dennisbuchwald/e-mail-check.de): Open Source, inklusive Score-Berechnung (docs/scoring.md)
- [${SITE.owner}](${SITE.ownerUrl}): Betreiber, privates Projekt
`;

	return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
