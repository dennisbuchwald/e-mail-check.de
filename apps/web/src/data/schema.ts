import { SITE } from './site';

export function faqSchema(items: { frage: string; antwort: string }[]) {
	if (!items.length) return [];
	return [
		{
			'@context': 'https://schema.org',
			'@type': 'FAQPage',
			mainEntity: items.map((q) => ({ '@type': 'Question', name: q.frage, acceptedAnswer: { '@type': 'Answer', text: q.antwort } })),
		},
	];
}

export function breadcrumbSchema(items: { href: string; label: string }[]) {
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.label, item: new URL(it.href, SITE.url).href })),
	};
}

export const websiteSchema = {
	'@context': 'https://schema.org',
	'@type': 'WebSite',
	name: SITE.name,
	url: SITE.url,
	inLanguage: 'de-DE',
};

export const appSchema = {
	'@context': 'https://schema.org',
	'@type': 'WebApplication',
	name: 'Mail-Tester von e-mail-check.de',
	url: SITE.url,
	applicationCategory: 'UtilitiesApplication',
	operatingSystem: 'Alle (im Browser)',
	inLanguage: 'de-DE',
	offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
	author: { '@type': 'Person', name: SITE.owner, url: SITE.ownerUrl },
};

export function articleSchema(o: { title: string; description: string; path: string; date: string }) {
	return {
		'@context': 'https://schema.org',
		'@type': 'Article',
		headline: o.title,
		description: o.description,
		url: new URL(o.path, SITE.url).href,
		dateModified: o.date,
		inLanguage: 'de-DE',
		author: { '@type': 'Person', name: SITE.owner, url: SITE.ownerUrl },
		publisher: { '@type': 'Person', name: SITE.owner, url: SITE.ownerUrl },
	};
}
