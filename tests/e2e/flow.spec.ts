import { expect, test } from '@playwright/test';
import { sendMail } from './smtp';

test('start → mail → animation → result → steps → share', async ({ page, context }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kommt deine Mail an?');
	const addressEl = page.locator('[data-address]');
	await expect(addressEl).toContainText('@test.e-mail-check.de');
	const address = (await addressEl.innerText()).replace(/\s/g, '');

	await page.getByRole('button', { name: 'Kopieren' }).first().click();
	await expect(page.getByRole('button', { name: 'Kopiert' }).first()).toBeVisible();
	await page.getByRole('button', { name: 'Mail ist raus' }).click();
	await expect(page.getByRole('heading', { name: 'Wir warten auf deine Mail' })).toBeVisible();

	// example.com publishes "v=spf1 -all" and DMARC p=reject: a deterministic failing sender.
	const codes = await sendMail(address, { from: 'max@example.com', ip: '203.0.113.10', helo: 'mail.example.com', subject: 'Angebot', body: 'Hallo, hier das Angebot.' });
	expect(codes).toContain(250);

	// The animation follows real events: the received step turns done.
	await expect(page.locator('[data-step="received"]')).toHaveAttribute('data-state', 'done', { timeout: 20_000 });
	await expect(page).toHaveURL(/\/ergebnis\/[\w-]{22}$/, { timeout: 30_000 });
	const score = page.locator('[data-score-value]');
	await expect(score).toHaveText(/^\d+,\d$/);
	await expect(page.locator('.rv-chips')).toContainText('Hohes Risiko');
	await expect(page.locator('[data-auth-warning]')).toBeVisible();
	await expect(page.locator('[data-mh-from]')).toHaveText('max@example.com');

	// The verdict and the steps come first; example.com fails SPF and DMARC, so there is something to do.
	await expect(page.locator('.rv-verdict')).toBeVisible();
	await expect(page.locator('[data-todo]').first()).toBeVisible();
	await expect(page.locator('[data-todo].is-bad').first()).toBeVisible();
	// Right after the own test: the dbw media offer, marked, with the problem type only.
	const setup = page.locator('.rv-setup a').first();
	await expect(setup).toHaveAttribute('href', /^https:\/\/dbw-media\.de\/projektanfrage\/\?utm_source=e-mail-check&utm_medium=ergebnis&utm_campaign=mail-setup&utm_content=[a-z-]+$/);
	await expect(setup).toHaveAttribute('rel', 'noopener');
	await expect(page.locator('.rv-setup').first()).toContainText('Angebot von dbw media');
	// No start page sections in result mode.
	await expect(page.locator('.home-below')).toBeHidden();

	// The compact scene replays this mail once; six station buttons sit on its markers, details are closed.
	const hots = page.locator('.rv-hot');
	await expect(hots).toHaveCount(6);
	await page.locator('[data-rv-scene]').scrollIntoViewIfNeeded();
	await expect(page.locator('[data-rv-scene] svg')).toBeVisible();
	await expect(page.locator('[data-rv-scene]')).toHaveAttribute('aria-label', /Station 1 Absender/);
	await expect(page.locator('[data-panel]:visible')).toHaveCount(0);
	await hots.first().click();
	await expect(page.locator('#rv-panel-0')).toBeVisible();
	await expect(hots.first()).toHaveAttribute('aria-expanded', 'true');
	// Keyboard: arrow keys move between the stations, Enter opens one.
	await hots.first().focus();
	await page.keyboard.press('ArrowRight');
	await expect(hots.nth(1)).toBeFocused();
	await page.keyboard.press('Enter');
	await expect(page.locator('#rv-panel-1')).toBeVisible();
	await expect(page.locator('#rv-panel-0')).toBeHidden();

	// Mail source: text, HTML and headers come only from the live session.
	await page.getByRole('button', { name: 'Mail-Quelle & Header' }).click();
	await expect(page.locator('[data-preview-text]')).toContainText('Hallo, hier das Angebot.');
	await page.locator('[data-src="headers"]').click();
	await expect(page.locator('[data-preview-headers]')).toContainText('Subject: Angebot');

	// Share link: open it in a new page, it renders the same result and is noindex.
	const url = page.url();
	const shared = await context.newPage();
	const res = await shared.goto(url);
	expect(res?.headers()['x-robots-tag']).toContain('noindex');
	await expect(shared.locator('[data-score-value]')).toHaveText(await score.innerText());
	await expect(shared.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
	// The shared page never has the mail itself.
	await shared.getByRole('button', { name: 'Mail-Quelle & Header' }).click();
	await expect(shared.locator('[data-preview-missing]').first()).toBeVisible();
	// The shared link never shows the dbw media offer.
	await expect(shared.locator('.rv-setup')).toHaveCount(0);
	// Server-rendered: steps and stations are in the HTML even without JavaScript.
	const html = await (await shared.request.get(url)).text();
	expect(html.match(/class="rv-hot( [^"]*)?"/g)?.length).toBe(6);
	expect(html).toContain('data-todo');
	// "Für Nerds": the whole calculation and every list, collapsed, also without JavaScript.
	expect(html).toContain('<details class="card rv-nerd"');
	expect(html).toContain('So kommt die Zahl zustande');
	await expect(shared.locator('.rv-nerd')).not.toHaveAttribute('open', '');
	await shared.locator('.rv-nerd summary').click();
	await expect(shared.locator('.rv-ledger tfoot')).toContainText(await score.innerText());
	expect(html).toContain('Hier landet viel im Spam.');
});

test.describe('real DNS', () => {
	// The only test that asks the internet (example.com via unbound): retried, so a slow resolver is no red build.
	test.describe.configure({ retries: 2 });
	test('DNS quick check shows findings for a real domain', async ({ page }) => {
		await page.goto('/dmarc-check');
		await page.getByLabel('Deine Domain').fill('example.com');
		await page.getByRole('button', { name: 'Jetzt prüfen' }).click();
		await expect(page.locator('[data-dns-headline]')).toContainText('example.com');
		await expect(page.locator('[data-dns-findings] .check')).toHaveCount(3);
		await expect(page.locator('[data-dns-findings] .check').first()).toContainText('DMARC');
	});
});

test('expired or unknown result shows a friendly message', async ({ page }) => {
	await page.goto('/ergebnis/AAAAAAAAAAAAAAAAAAAAAA');
	await expect(page.getByRole('heading', { name: 'Ergebnis nicht gefunden' })).toBeVisible();
});

test('content pages have one h1, canonical and a link to the tool', async ({ page }) => {
	for (const path of ['/spf-check', '/wissen/dmarc', '/anleitung/ionos/dkim', '/anleitung/hetzner/spf-dkim-dmarc', '/anleitung']) {
		await page.goto(path);
		await expect(page.locator('h1')).toHaveCount(1);
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://e-mail-check.de${path}`);
		expect(await page.locator('main a[href="/"]').count()).toBeGreaterThan(0);
	}
});

test('status bar: Ratgeber menu works with the keyboard and the counter never shows a made-up number', async ({ page }) => {
	await page.goto('/spf-check');
	const button = page.getByRole('button', { name: 'Ratgeber' });
	await button.focus();
	await page.keyboard.press('Enter');
	await expect(button).toHaveAttribute('aria-expanded', 'true');
	await expect(page.locator('#ratgeber-menu a').first()).toBeFocused();
	await page.keyboard.press('ArrowDown');
	await expect(page.locator('#ratgeber-menu a').nth(1)).toBeFocused();
	await page.keyboard.press('Escape');
	await expect(button).toHaveAttribute('aria-expanded', 'false');
	await expect(button).toBeFocused();
	const stats = await (await page.request.get('/api/stats')).json();
	const text = (await page.locator('[data-checked]').textContent()) ?? '';
	if (stats.mailsChecked === null) expect(text).toBe(' · Kostenlos · ohne Konto');
	else expect(text).toBe(` · ${stats.mailsChecked.toLocaleString('de-DE')} Mails geprüft`);
	await expect(page.locator('.statusbar a[aria-label="mail check, Startseite"]')).toHaveAttribute('href', '/');
});

test('mail route: the scene follows the scroll, every station turns green at the last step', async ({ page }) => {
	await page.goto('/');
	const steps = page.locator('.route-step');
	await expect(steps).toHaveCount(6);
	await steps.first().scrollIntoViewIfNeeded();
	const scene = page.locator('[data-mailroute] svg');
	await expect(scene).toBeVisible();
	await expect(page.locator('[data-mailroute]')).toHaveAttribute('aria-label', /Weg einer Mail/);
	await page.evaluate(() => {
		const last = document.querySelectorAll<HTMLElement>('.route-step')[5].getBoundingClientRect();
		window.scrollBy({ top: last.top + last.height / 2 - innerHeight * 0.3, behavior: 'instant' });
	});
	// every station's marker has popped (r > 0), the envelope became the logo with its green check, the finale text shows
	await expect.poll(() => page.locator('[data-mailroute] .mk-done').evaluateAll((els) => els.filter((e) => Number(e.getAttribute('r')) > 0).length), { timeout: 5000 }).toBe(6);
	await expect.poll(() => page.locator('[data-mailroute] .badge').getAttribute('r').then(Number), { timeout: 5000 }).toBeGreaterThan(0);
	await expect(page.getByText('Angekommen.')).toBeVisible();
});

test('"Eingetragen? Jetzt prüfen": the DNS re-check turns the step green and raises the score provisionally', async ({ page }) => {
	const { readFileSync } = await import('node:fs');
	const result = JSON.parse(readFileSync('tests/e2e/fixtures/dmarc-none.json', 'utf8'));
	const shell = readFileSync('apps/web/dist/ergebnis.html', 'utf8');
	let policy = 'none';
	await page.route('**/api/results/*', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(result) }));
	await page.route(`**/ergebnis/${result.id}`, (r) => r.fulfill({ contentType: 'text/html', body: shell }));
	// The shell comes from the local build, so its scripts must too (the container may carry other hashes).
	await page.route('**/_astro/**', (r) => {
		const file = `apps/web/dist${new URL(r.request().url()).pathname}`;
		r.fulfill({ body: readFileSync(file), contentType: file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : undefined });
	});
	await page.route('**/api/dns?*', (r) =>
		r.fulfill({ contentType: 'application/json', body: JSON.stringify({ findings: [{ id: 'dmarc', status: policy === 'none' ? 'warn' : 'ok', raw: { record: `v=DMARC1; p=${policy}`, policy } }] }) }),
	);
	await page.goto(`/ergebnis/${result.id}`);
	const card = page.locator('[data-todo]').first();
	await expect(card).toContainText('_dmarc');
	await expect(page.locator('.rv-guide, [data-todo] a').filter({ hasText: "So geht's bei IONOS" }).first()).toBeVisible();
	// The shared link never carries the dbw media offer.
	await expect(page.locator('.rv-setup')).toHaveCount(0);

	// Not there yet: a friendly note, the card stays open.
	await card.getByRole('button', { name: 'Eingetragen? Jetzt prüfen' }).click();
	await expect(card.locator('[data-todo-status]')).toContainText('Noch nicht sichtbar');
	await expect(card).not.toHaveClass(/is-done/);

	// Entered: green card, provisional score above the measured one, the station turns green.
	policy = 'quarantine';
	await card.getByRole('button', { name: 'Eingetragen? Jetzt prüfen' }).click();
	await expect(card).toHaveClass(/is-done/);
	await expect(page.locator('[data-provisional]')).toBeVisible();
	await expect.poll(async () => Number((await page.locator('[data-score-value]').innerText()).replace(',', '.'))).toBeGreaterThan(result.score);
});
