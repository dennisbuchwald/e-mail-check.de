// Redesign V2 acceptance screenshots: start page widths, wordmark scroll states,
// reduced motion and the Firefox fallback (no scroll timelines).
// Usage: node scripts/screenshots-v2.mjs <out-dir> [base-url]   (needs the local Docker stack)
import { chromium, firefox } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'docs/redesign/v2/nachher';
const base = process.argv[3] ?? 'http://localhost:8080';
mkdirSync(out, { recursive: true });

async function shots(browserType, opts, tag) {
	const browser = await browserType.launch(browserType === chromium ? { channel: 'chrome' } : {});
	for (const [name, width, height] of [['1440', 1440, 900], ['1280', 1280, 800], ['390', 390, 844]]) {
		if (tag !== 'chrome' && name !== '1440') continue;
		const page = await browser.newPage({ viewport: { width, height }, reducedMotion: opts.reducedMotion ?? 'no-preference' });
		await page.goto(`${base}/`);
		await page.waitForSelector('[data-address] .nw');
		await page.waitForTimeout(1500);
		await page.screenshot({ path: `${out}/${tag}-start-${name}.png` });
		if (name !== '390') {
			for (const y of [0, 60, 120, 200]) {
				await page.evaluate((v) => window.scrollTo(0, v), y);
				await page.waitForTimeout(450);
				await page.screenshot({ path: `${out}/${tag}-wortmarke-${name}-${y}.png`, clip: { x: 0, y: 0, width: 520, height: 90 } });
			}
		}
		await page.close();
	}
	await browser.close();
}

await shots(chromium, {}, 'chrome');
await shots(chromium, { reducedMotion: 'reduce' }, 'reduced');
await shots(firefox, {}, 'firefox').catch((e) => console.log('Firefox nicht verfügbar:', e.message.split('\n')[0]));
console.log(`Screenshots in ${out}`);
