// The result page twice per fixture: right after a (simulated) test on the start page, and via the shared link.
// Both must look the same (apart from the dbw media line, which only the tester sees). Desktop 1440 and phone 390.
// Usage: node scripts/result-compare-screenshots.mjs <fixtures-dir> [out-dir] [base-url]   (base-url serves apps/web/dist)
import { chromium } from '@playwright/test';
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const [dir, out = 'screenshots/ergebnis-fix', base = 'http://localhost:4399'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const shell = readFileSync('apps/web/dist/ergebnis.html', 'utf8');
const browser = await chromium.launch({ channel: 'chrome' });
const errors = [];
const report = [];
const STEPS = ['received', 'spf', 'dkim', 'dmarc', 'reputation', 'content'];

async function shoot(result, mode, dev, width, height, file) {
	const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
	const page = await ctx.newPage();
	page.on('pageerror', (e) => errors.push(`${file}: ${e.message}`));
	await page.route('**/api/stats', (r) => r.fulfill({ contentType: 'application/json', body: '{"mailsChecked":null}' }));
	await page.route('**/api/results/*', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(result) }));
	if (mode === 'link') {
		await page.route(`${base}/ergebnis/*`, (r) => r.fulfill({ contentType: 'text/html', body: shell }));
		await page.goto(`${base}/ergebnis/${result.id}`);
	} else {
		const test = { id: 'T'.repeat(22), address: 'abcd2345@test.e-mail-check.de', state: 'waiting', done: [], resultId: null, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 3600e3).toISOString() };
		await page.route('**/api/tests', (r) => r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(test) }));
		const sse = STEPS.map((s) => `event: step\ndata: ${JSON.stringify({ type: 'step', step: s, ...(s === 'received' ? { mail: { from: result.mail.from, subject: result.mail.subject } } : {}) })}\n\n`).join('') + `event: done\ndata: ${JSON.stringify({ type: 'done', resultId: result.id })}\n\n`;
		await page.route('**/api/tests/*/events', (r) => r.fulfill({ contentType: 'text/event-stream', body: sse }));
		await page.route('**/api/tests/T*', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ ...test, state: 'done', resultId: result.id }) }));
		await page.goto(`${base}/`);
		await page.waitForURL(/\/ergebnis\//, { timeout: 20000 });
	}
	await page.waitForSelector('[data-rv-scene] svg');
	// The scene only draws while it is on screen: bring it into view once, then back to the top.
	await page.locator('[data-rv-scene]').scrollIntoViewIfNeeded();
	await page.waitForTimeout(1500);
	await page.evaluate(() => window.scrollTo(0, 0));
	await page.waitForTimeout(300);
	const facts = await page.evaluate(() => ({
		height: Math.round(document.documentElement.scrollHeight),
		homeBelow: [...document.querySelectorAll('.home-below')].some((e) => e.getBoundingClientRect().height > 0),
		todos: document.querySelectorAll('[data-todo]').length,
		setup: document.querySelectorAll('.rv-setup').length,
		todoTop: Math.round(document.querySelector('.rv-todos, .rv-green')?.getBoundingClientRect().top ?? -1),
		sceneH: Math.round(document.querySelector('[data-rv-scene]').getBoundingClientRect().height),
	}));
	await page.screenshot({ path: `${out}/${file}.png`, fullPage: true });
	await ctx.close();
	return facts;
}

for (const f of readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
	const name = f.replace(/\.json$/, '');
	const result = JSON.parse(readFileSync(join(dir, f), 'utf8'));
	for (const [dev, w, h] of [['desktop', 1440, 900], ['mobil', 390, 844]]) {
		const link = await shoot(result, 'link', dev, w, h, `${name}-${dev}-link`);
		const live = await shoot(result, 'test', dev, w, h, `${name}-${dev}-nach-test`);
		report.push(`${name.padEnd(24)} ${dev.padEnd(7)} Link: ${JSON.stringify(link)}\n${' '.repeat(33)}Test: ${JSON.stringify(live)}`);
	}
}
await browser.close();
console.log(report.join('\n'));
console.log(errors.length ? errors.join('\n') : 'keine Seitenfehler');
