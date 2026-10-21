// Result V2 screenshots for four states (desktop + phone). The state JSON comes from
// apps/engine/scripts/result-states.ts; the page loads a real result id, the server-rendered part and the API answer are swapped.
// Usage: node scripts/result-screenshots.mjs <states-dir> <out-dir> <real-result-id> [base-url]
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { renderResultView } from '../packages/shared/src/result-view.ts';

const [dir, out, id, base = 'http://localhost:8080'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
	const name = file.replace('.json', '');
	const data = JSON.parse(readFileSync(`${dir}/${file}`, 'utf8'));
	data.id = id;
	for (const [tag, width, height] of [['desktop', 1440, 900], ['mobil', 390, 844]]) {
		for (const motion of tag === 'desktop' && name === 'spf-fehlt' ? ['no-preference', 'reduce'] : ['no-preference']) {
			const page = await browser.newPage({ viewport: { width, height }, reducedMotion: motion });
			await page.route(`**/api/results/${id}`, (r) => r.fulfill({ json: data }));
			await page.route(`**/ergebnis/${id}`, async (r) => {
				const res = await r.fetch();
				const html = (await res.text()).replace(/<!--rv-->[\s\S]*?<!--\/rv-->/, renderResultView(data, { shareUrl: `${base}/ergebnis/${id}` }));
				await r.fulfill({ response: res, body: html });
			});
			await page.goto(`${base}/ergebnis/${id}`);
			await page.waitForTimeout(3200);
			const suffix = motion === 'reduce' ? '-reduced' : '';
			await page.screenshot({ path: `${out}/${tag}-${name}${suffix}.png`, fullPage: true });
			await page.close();
		}
	}
}
await browser.close();
console.log(`Screenshots in ${out}`);
