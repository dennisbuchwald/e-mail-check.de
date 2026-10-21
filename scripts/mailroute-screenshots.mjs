// Screenshots of "Der Weg deiner Mail" at progress 0, 0.5 and 1 (desktop and phone) plus reduced motion.
// Usage: node scripts/mailroute-screenshots.mjs <out-dir> [base-url]   (base-url: a server for apps/web/dist)
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'screenshots/mailroute';
const base = process.argv[3] ?? 'http://localhost:4399';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const errors = [];
for (const [name, width, height, reducedMotion] of [['desktop', 1440, 900, 'no-preference'], ['mobil', 390, 844, 'no-preference'], ['reduced', 1440, 900, 'reduce']]) {
	const page = await browser.newPage({ viewport: { width, height }, reducedMotion });
	page.on('console', (m) => m.type() === 'error' && errors.push(`${name}: ${m.text()}`));
	page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
	// Without the engine the hero shows its error card and focuses it; let that happen before scrolling.
	await page.route('**/api/**', (r) => r.fulfill({ status: 503, body: '{}' }));
	await page.goto(`${base}/`);
	await page.waitForTimeout(3000);
	const list = await page.evaluate(() => {
		const mid = (el) => { const r = el.getBoundingClientRect(); return r.top + scrollY + r.height / 2; };
		const steps = document.querySelectorAll('.route-step');
		const box = document.querySelector('[data-mailroute]').getBoundingClientRect();
		return { top: mid(steps[0]), height: mid(steps[steps.length - 1]) - mid(steps[0]), stage: box.height };
	});
	const stops = reducedMotion === 'reduce' ? [['liste', list.top - 300, 0]] : (process.env.PS ? process.env.PS.split(',').map(Number) : [0, 0.17, 0.33, 0.5, 0.67, 0.83, 1]).map((p) => {
		const free = width <= 1080 ? 76 + 16 + list.stage : 0;
		const line = free + (height - free) / 2;
		return [`p${String(p).replace('.', '')}`, list.top + p * list.height - line, p];
	});
	await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'instant' }));
	await page.waitForTimeout(2500);
	for (const [tag, y] of stops) {
		await page.evaluate((v) => window.scrollTo({ top: v, behavior: 'instant' }), Math.round(y));
		// correct once more with the live layout (sticky scene on phones), same formula as mailroute-section.ts
		await page.waitForTimeout(300);
		await page.evaluate((p) => {
			const mid = (el) => { const r = el.getBoundingClientRect(); return r.top + r.height / 2; };
			const st = document.querySelectorAll('.route-step');
			const top = innerWidth <= 1080 ? document.querySelector('[data-mailroute]').getBoundingClientRect().bottom : 0;
			const line = top + (innerHeight - top) / 2;
			const target = mid(st[0]) + p * (mid(st[st.length - 1]) - mid(st[0]));
			window.scrollBy({ top: target - line, behavior: 'instant' });
		}, typeof tag === 'string' && tag.startsWith('p') ? stops.find((s) => s[0] === tag)[2] ?? 0 : 0);
		await page.waitForTimeout(1800);
		console.log(name, tag, Math.round(y), await page.evaluate(() => Math.round(scrollY)));
		await page.screenshot({ path: `${out}/${name}-${tag}.png` });
		if (process.env.SCENE) {
			const bb = await page.evaluate(() => { const s = document.querySelector('[data-mailroute] svg'); const b = s.querySelector('g').getBBox(); return [b.x, b.y, b.width, b.height].map(Math.round); });
			console.log('  bbox', bb.join(' '));
			await page.locator('[data-mailroute]').screenshot({ path: `${out}/szene-${name}-${tag}.png` });
		}
	}
	await page.close();
}
await browser.close();
console.log(errors.length ? errors.join('\n') : 'keine Konsolenfehler');
console.log(`Screenshots in ${out}`);
