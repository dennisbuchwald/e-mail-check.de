// Screenshots of the key screens (desktop + mobile) for before/after comparisons.
// Usage: node scripts/screenshots.mjs <out-dir> [base-url]   (needs the local Docker stack)
import { chromium } from '@playwright/test';
import { createConnection } from 'node:net';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'docs/redesign/nachher';
const base = process.argv[3] ?? 'http://localhost:8080';
mkdirSync(out, { recursive: true });

function smtp(to) {
	const msg = ['From: Max <max@example.com>', `To: ${to}`, 'Subject: Ihr Angebot fuer die Website', `Date: ${new Date().toUTCString()}`, 'Message-ID: <s1@example.com>', 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=utf-8', '', 'Hallo, anbei das Angebot.'].join('\r\n');
	const cmds = ['EHLO mail.example.com', 'XCLIENT ADDR=203.0.113.10', 'EHLO mail.example.com', 'MAIL FROM:<max@example.com>', `RCPT TO:<${to}>`, 'DATA', `${msg}\r\n.`, 'QUIT'];
	return new Promise((res) => {
		const s = createConnection(2525, '127.0.0.1');
		let buf = '', i = 0;
		s.on('data', (d) => { buf += d; let m; while ((m = /^(\d{3}) .*\r\n/m.exec(buf))) { buf = buf.slice(m.index + m[0].length); if (i < cmds.length) s.write(cmds[i++] + '\r\n'); else s.end(); } });
		s.on('end', res);
	});
}

const browser = await chromium.launch({ channel: 'chrome' });
for (const [name, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobil', { width: 390, height: 844 }]]) {
	const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
	await page.goto(base + '/');
	await page.waitForSelector('[data-address]:not(:has(.address-loading))', { timeout: 10000 }).catch(() => {});
	await page.waitForTimeout(600);
	await page.screenshot({ path: `${out}/${name}-1-start.png` });
	await page.screenshot({ path: `${out}/${name}-2-start-ganz.png`, fullPage: true });
	const address = (await page.locator('[data-address]').innerText()).replace(/\s/g, '');
	await page.getByRole('button', { name: /Mail ist raus/ }).click();
	await page.waitForTimeout(400);
	await page.screenshot({ path: `${out}/${name}-3-warten.png` });
	await smtp(address);
	await page.waitForURL(/\/ergebnis\//, { timeout: 30000 });
	await page.waitForTimeout(1800);
	await page.screenshot({ path: `${out}/${name}-4-ergebnis.png`, fullPage: true });
	await page.goto(base + '/anleitung/ionos/dmarc');
	await page.screenshot({ path: `${out}/${name}-5-anleitung.png` });
	await page.goto(base + '/dmarc-check?domain=example.com');
	await page.waitForTimeout(2500);
	await page.screenshot({ path: `${out}/${name}-6-dmarc-check.png` });
	await page.close();
}
await browser.close();
console.log('Screenshots in', out);
