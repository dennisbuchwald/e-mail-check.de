import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
	site: 'https://e-mail-check.de',
	trailingSlash: 'never',
	build: { format: 'file', inlineStylesheets: 'always' },
	integrations: [
		sitemap({
			// Result pages and legal drafts are not for search engines.
			filter: (page) => !/\/(ergebnis|404)/.test(page),
		}),
	],
	server: { port: 4321 },
	vite: {
		// Never inline scripts: the CSP only allows script-src 'self'.
		build: { assetsInlineLimit: 0 },
		server: {
			proxy: { '/api': { target: process.env.API_URL ?? 'http://localhost:8787', changeOrigin: false } },
		},
	},
});
