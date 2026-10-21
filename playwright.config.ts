import { defineConfig, devices } from '@playwright/test';

// Runs against the local Docker stack: `docker compose up -d --build` first.
export default defineConfig({
	testDir: 'tests/e2e',
	timeout: 60_000,
	use: { baseURL: process.env.BASE_URL ?? 'http://localhost:8080', channel: 'chrome', permissions: ['clipboard-read', 'clipboard-write'] },
	projects: [
		{ name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
		{ name: 'mobile', use: { ...devices['Pixel 7'], channel: 'chrome' } },
	],
});
