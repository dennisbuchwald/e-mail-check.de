import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const faq = z.array(z.object({ frage: z.string(), antwort: z.string() })).default([]);
const quelle = z.object({ titel: z.string(), url: z.string().url() });

/** One step of a guide, also shown inside the test result ("So behebst du das"). */
const schritt = z.object({
	/** Short instruction, plain text with **bold** allowed. */
	text: z.string(),
	/** Optional DNS record to copy. {domain} is replaced with the user's domain. */
	eintrag: z
		.object({
			typ: z.enum(['TXT', 'CNAME', 'MX']),
			host: z.string(),
			wert: z.string(),
		})
		.optional(),
});

const thema = z.enum(['spf', 'dkim', 'dmarc']);

/** Provider guides: src/content/anleitung/<anbieter>/<thema>.md → /anleitung/<anbieter>/<thema> */
const anleitung = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './src/content/anleitung' }),
	schema: z.object({
		titel: z.string(), // H1
		seoTitel: z.string().max(60),
		beschreibung: z.string().max(155),
		keyword: z.string(),
		anbieter: z.enum(['ionos', 'strato', 'all-inkl', 'hetzner', 'microsoft-365', 'google-workspace']),
		anbieterName: z.string(),
		/** Topics this page covers. Hetzner covers all three on one page. */
		themen: z.array(thema).min(1),
		dauer: z.string(), // e.g. "5 Minuten"
		kurzantwort: z.string(),
		/** Steps per topic for the in-tool guide (max ~6 each). */
		schritte: z.object({ spf: z.array(schritt).optional(), dkim: z.array(schritt).optional(), dmarc: z.array(schritt).optional() }),
		faq,
		quelle: z.array(quelle).min(1),
		stand: z.string(), // YYYY-MM-DD
		geprueft: z.boolean().default(false),
		offenePunkte: z.array(z.string()).default([]),
	}),
});

/** Knowledge pages: src/content/wissen/<slug>.md → /wissen/<slug> */
const wissen = defineCollection({
	loader: glob({ pattern: '*.md', base: './src/content/wissen' }),
	schema: z.object({
		titel: z.string(),
		seoTitel: z.string().max(60),
		beschreibung: z.string().max(155),
		keyword: z.string(),
		kurz: z.string(), // first answer, 2-3 sentences
		faq,
		quelle: z.array(quelle).default([]),
		stand: z.string(),
		reihenfolge: z.number().default(99),
	}),
});

/** Copy for tool pages (/, /spf-check, /dkim-check, /dmarc-check): text below the tool. */
const seiten = defineCollection({
	loader: glob({ pattern: '*.md', base: './src/content/seiten' }),
	schema: z.object({
		titel: z.string(),
		seoTitel: z.string().max(60),
		beschreibung: z.string().max(155),
		keyword: z.string(),
		intro: z.string(),
		faq,
		stand: z.string(),
	}),
});

export const collections = { anleitung, wissen, seiten };
