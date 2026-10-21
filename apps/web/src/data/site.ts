// Site-wide constants and navigation. Single place for URLs used in header, footer and links.

export const SITE = {
	name: 'e-mail-check.de',
	url: 'https://e-mail-check.de',
	owner: 'Dennis Buchwald',
	ownerUrl: 'https://dennisbuchwald.de',
	/** "Lass es einrichten" target (decision 21.10.2026). */
	setupUrl: 'https://dennisbuchwald.de/kontakt',
};

export const PROVIDERS = [
	{ slug: 'ionos', name: 'IONOS' },
	{ slug: 'strato', name: 'STRATO' },
	{ slug: 'all-inkl', name: 'ALL-INKL' },
	{ slug: 'hetzner', name: 'Hetzner' },
	{ slug: 'google-workspace', name: 'Google Workspace' },
	{ slug: 'microsoft-365', name: 'Microsoft 365' },
] as const;

export type ProviderSlug = (typeof PROVIDERS)[number]['slug'];

export const TOPIC_NAMES = {
	spf: { klartext: 'Absender bestätigen', tech: 'SPF' },
	dkim: { klartext: 'Unterschrift einrichten', tech: 'DKIM' },
	dmarc: { klartext: 'Schutzregel einrichten', tech: 'DMARC' },
} as const;

/** Guide URL for a provider and topic (Hetzner has one page for all topics). */
export function guideUrl(provider: string, topic: 'spf' | 'dkim' | 'dmarc'): string {
	return provider === 'hetzner' ? '/anleitung/hetzner/spf-dkim-dmarc' : `/anleitung/${provider}/${topic}`;
}


export const FOOTER = [
	{
		title: 'Tools',
		links: [
			{ href: '/', label: 'Mail-Tester' },
			{ href: '/spf-check', label: 'SPF-Check' },
			{ href: '/dkim-check', label: 'DKIM-Check' },
			{ href: '/dmarc-check', label: 'DMARC-Check' },
			{ href: '/mail-tester-alternative', label: 'Mail-Tester-Alternative' },
		],
	},
	{
		title: 'Wissen',
		links: [
			{ href: '/wissen/spf-dkim-dmarc', label: 'SPF, DKIM, DMARC' },
			{ href: '/wissen/spf', label: 'SPF-Eintrag' },
			{ href: '/wissen/dkim', label: 'DKIM-Eintrag' },
			{ href: '/wissen/dmarc', label: 'DMARC-Eintrag' },
			{ href: '/wissen/mails-landen-im-spam', label: 'Mails landen im Spam' },
		],
	},
	{
		title: 'Anleitungen',
		links: [{ href: '/anleitung', label: 'Alle Anbieter' }, ...PROVIDERS.map((p) => ({ href: guideUrl(p.slug, 'dmarc'), label: `${p.name}` }))],
	},
	{
		title: 'Rechtliches',
		links: [
			{ href: '/impressum', label: 'Impressum' },
			{ href: '/datenschutz', label: 'Datenschutz' },
			{ href: '/avv', label: 'AVV-Vorlage' },
		],
	},
];

/** "Ratgeber" menu in the status bar: guides, knowledge pages and the DNS checks. */
export const RATGEBER = [
	{ title: 'Anleitungen', links: [{ href: '/anleitung', label: 'Alle Anbieter' }, ...PROVIDERS.map((p) => ({ href: guideUrl(p.slug, 'dmarc'), label: p.name }))] },
	{
		title: 'Wissen',
		links: [
			{ href: '/wissen/spf-dkim-dmarc', label: 'SPF, DKIM, DMARC' },
			{ href: '/wissen/spf', label: 'SPF-Eintrag' },
			{ href: '/wissen/dkim', label: 'DKIM-Eintrag' },
			{ href: '/wissen/dmarc', label: 'DMARC-Eintrag' },
			{ href: '/wissen/mails-landen-im-spam', label: 'Mails landen im Spam' },
		],
	},
	{
		title: 'Schnell-Checks',
		links: [
			{ href: '/spf-check', label: 'SPF-Check' },
			{ href: '/dkim-check', label: 'DKIM-Check' },
			{ href: '/dmarc-check', label: 'DMARC-Check' },
			{ href: '/mail-tester-alternative', label: 'Mail-Tester-Alternative' },
		],
	},
];
