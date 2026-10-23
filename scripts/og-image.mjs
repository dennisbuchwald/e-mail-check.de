// Renders apps/web/public/og.jpg (1200×630, JPEG: the grain makes a PNG ~800 KB): aura background (variant A), wordmark, H1. Static.
// Run: node scripts/og-image.mjs
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fonts = join(root, 'apps/web/node_modules/@fontsource-variable');
const font = (f) => `data:font/woff2;base64,${readFileSync(join(fonts, f)).toString('base64')}`;
const wordmark = `data:image/svg+xml;base64,${readFileSync(join(root, 'brand/wortmarke.svg')).toString('base64')}`;
const grain = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;
const html = `<!doctype html><html><head><style>
@font-face{font-family:F;src:url(${font('fraunces/files/fraunces-latin-opsz-normal.woff2')})}
@font-face{font-family:I;src:url(${font('inter/files/inter-latin-wght-normal.woff2')})}
body{margin:0;width:1200px;height:630px;position:relative;overflow:hidden;background:#fff;font-family:I;color:#111113}
.aura{position:absolute;inset:0}
.aura i{position:absolute;border-radius:50%;filter:blur(80px);opacity:.92}
.b1{width:66%;height:100%;left:-14%;top:-22%;background:#6F86FF}
.b2{width:58%;height:90%;left:26%;top:-30%;background:#B18CFF}
.b3{width:56%;height:92%;right:-14%;top:4%;background:#F3A8D2}
.b4{width:52%;height:70%;left:4%;top:56%;background:#FFD9C7;opacity:.85}
.aura:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,0) 30%,rgba(255,255,255,.5) 100%)}
.grain{position:absolute;inset:0;opacity:.18;mix-blend-mode:overlay;background-image:${grain}}
.in{position:relative;height:100%;box-sizing:border-box;padding:64px 80px;display:flex;flex-direction:column;justify-content:space-between}
.wm{height:96px;width:auto;align-self:flex-start}
h1{font-family:F;font-weight:680;font-variation-settings:'SOFT' 0,'WONK' 0;font-size:96px;line-height:1.02;letter-spacing:-.03em;margin:0}
.row{display:flex;gap:14px;font-size:24px;font-weight:600}
.pill{border:1px solid rgba(255,255,255,.9);background:rgba(255,255,255,.7);border-radius:999px;padding:10px 22px;display:flex;align-items:center;gap:12px}
.dot{width:14px;height:14px;border-radius:99px;background:#02ca50}
</style></head><body>
<div class="aura"><i class="b1"></i><i class="b2"></i><i class="b3"></i><i class="b4"></i></div><div class="grain"></div>
<div class="in"><img class="wm" src="${wordmark}" alt="">
<h1>Kommt deine Mail an?<br>Test in 30 Sekunden.</h1>
<div class="row"><div class="pill"><i class="dot"></i>Score 0 bis 10</div><div class="pill">SPF · DKIM · DMARC</div><div class="pill">Server in Deutschland</div></div></div>
</body></html>`;
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.evaluate(async () => { await document.fonts.load('680 20px F'); await document.fonts.load('600 20px I'); await document.fonts.ready; });
await page.screenshot({ path: join(root, 'apps/web/public/og.jpg'), type: 'jpeg', quality: 86 });
await browser.close();
console.log('og.jpg written');
