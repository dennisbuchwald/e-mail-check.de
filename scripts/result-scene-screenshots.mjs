// Screenshots of the result scene for every fixture (apps/engine/scripts/scene-fixtures.ts), desktop and phone.
// Usage: node scripts/result-scene-screenshots.mjs <fixtures-dir> [out-dir] [base-url]   (base-url serves apps/web/dist)
// REPLAY=1 also records a video of the replay per fixture.
import { chromium } from '@playwright/test';
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
const out = process.argv[3] ?? 'screenshots/ergebnis-szene';
const base = process.argv[4] ?? 'http://localhost:4399';
mkdirSync(out, { recursive: true });
const shell = readFileSync('apps/web/dist/ergebnis.html', 'utf8');
const browser = await chromium.launch({ channel: 'chrome' });
const errors = [];
for (const file of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
	const name = file.replace(/\.json$/, '');
	const result = JSON.parse(readFileSync(join(dir, file), 'utf8'));
	for (const [dev, width, height] of [['desktop', 1280, 1000], ['mobil', 390, 1100]]) {
		const replay = process.env.REPLAY === '1' && dev === 'desktop';
		const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: replay ? 'no-preference' : 'reduce', ...(replay ? { recordVideo: { dir: out, size: { width, height } } } : {}) });
		const page = await ctx.newPage();
		page.on('pageerror', (e) => errors.push(`${name} ${dev}: ${e.message}`));
		page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(`${name} ${dev}: ${m.text()}`));
		await page.route(`${base}/ergebnis/*`, (r) => r.fulfill({ contentType: 'text/html', body: shell }));
		await page.route('**/api/results/*', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(result) }));
		await page.route('**/api/stats', (r) => r.fulfill({ contentType: 'application/json', body: '{"mailsChecked":null}' }));
		await page.goto(`${base}/ergebnis/${result.id}`);
		await page.waitForSelector('[data-rv-scene] svg');
		// the replay starts when the scene is on screen: bring it into view first
		await page.evaluate(() => document.querySelector('.rv-route').scrollIntoView({ block: 'start', behavior: 'instant' }));
		await page.waitForTimeout(replay ? 7000 : 1600);
		await page.locator('.rv-route').screenshot({ path: `${out}/${name}-${dev}.png` });
		await ctx.close();
	}
}
await browser.close();
console.log(errors.length ? errors.join('\n') : 'keine Fehler');
