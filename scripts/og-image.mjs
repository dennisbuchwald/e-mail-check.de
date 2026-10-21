// Renders apps/web/public/og.png (1200×630) with the local brand fonts. Run: node scripts/og-image.mjs
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fonts = join(root, 'apps/web/node_modules/@fontsource-variable');
const font = (f) => `data:font/woff2;base64,${readFileSync(join(fonts, f)).toString('base64')}`;
const html = `<!doctype html><html><head><style>
@font-face{font-family:F;src:url(${font('fraunces/files/fraunces-latin-opsz-normal.woff2')})}
@font-face{font-family:I;src:url(${font('inter/files/inter-latin-wght-normal.woff2')})}
body{margin:0;width:1200px;height:630px;background:#fff;font-family:I;color:#1d1d1f;box-sizing:border-box;padding:40px}
.card{height:100%;box-sizing:border-box;border:10px solid #1d1d1f;border-radius:48px;padding:64px 72px;display:flex;flex-direction:column;justify-content:space-between}
.top{display:flex;align-items:center;gap:16px;font-family:F;font-weight:680;font-size:34px;letter-spacing:-.02em}
.top span{color:#8a8c8b}
h1{font-family:F;font-weight:680;font-variation-settings:'SOFT' 0,'WONK' 0;font-size:92px;line-height:1.02;letter-spacing:-.03em;margin:0}
.row{display:flex;gap:14px;font-size:26px;font-weight:600}
.pill{border:3px solid #1d1d1f;border-radius:999px;padding:8px 22px;display:flex;align-items:center;gap:12px}
.dot{width:16px;height:16px;border-radius:99px;background:#02ca50}
</style></head><body><div class="card">
<div class="top"><svg width="64" height="64" viewBox="0 0 120 120"><defs><mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="120" height="120"><rect width="120" height="120" fill="#fff"/><path d="M26 60 L51 78 L76 60" fill="none" stroke="#000" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><circle cx="96" cy="36" r="25" fill="#000"/></mask></defs><rect x="8" y="40" width="86" height="62" rx="13" fill="#1D1D1F" mask="url(#m)"/><circle cx="96" cy="36" r="18" fill="#02CA50"/><path d="M88.5 36.5 L94 42 L103.5 31.5" fill="none" stroke="#1D1D1F" stroke-width="5.8" stroke-linecap="round" stroke-linejoin="round"/></svg><b style="font-weight:680">e-mail-check<span>.de</span></b></div>
<h1>Kommt deine Mail an?<br>Test in 30 Sekunden.</h1>
<div class="row"><div class="pill"><i class="dot"></i>Score 0 bis 10</div><div class="pill">SPF · DKIM · DMARC</div><div class="pill">Server in Deutschland</div></div>
</div></body></html>`;
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.evaluate(async () => { await document.fonts.load('680 20px F'); await document.fonts.load('600 20px I'); await document.fonts.ready; });
await page.screenshot({ path: join(root, 'apps/web/public/og.png') });
await browser.close();
console.log('og.png written');
