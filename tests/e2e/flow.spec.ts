import { expect, test } from '@playwright/test';
import { sendMail } from './smtp';

test('start → mail → animation → result → guide → share', async ({ page, context }) => {
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

	// Six stations as tabs; the first one with a problem is open, the route breaks there.
	const tabs = page.getByRole('tab', { name: /Absender|Unterschrift|Schutzregel|Server-Ruf|Transport|Posteingang/ });
	await expect(tabs).toHaveCount(6);
	await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
	await expect(page.locator('.rv-st.is-bad').first()).toBeVisible();
	await expect(page.getByText('Hier bleibt deine Mail hängen.')).toBeVisible();
	await expect(page.locator('.rv-panel[data-open] .rv-fix')).toContainText(/\+\d+,\d Pkt\. bei Behebung/);

	// Keyboard: arrow keys move between stations (tablist).
	await tabs.first().focus();
	await page.keyboard.press('ArrowRight');
	await expect(tabs.nth(1)).toBeFocused();
	await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
	await expect(page.locator('#rv-panel-1')).toBeVisible();
	await expect(page.locator('#rv-panel-0')).toBeHidden();
	await page.keyboard.press('ArrowLeft');

	// Action plan (more than one problem) jumps to a station.
	await page.locator('[data-goto]').first().click();

	// Mail source: text, HTML and headers come only from the live session.
	await page.getByRole('button', { name: 'Mail-Quelle & Header' }).click();
	await expect(page.locator('[data-preview-text]')).toContainText('Hallo, hier das Angebot.');
	await page.locator('[data-src="headers"]').click();
	await expect(page.locator('[data-preview-headers]')).toContainText('Subject: Angebot');

	// The fix leads to the provider guide.
	await page.locator('#rv-panel-0').evaluate(() => undefined);
	await tabs.first().click();
	await page.locator('.rv-panel[data-open] [data-fix]').click();
	await expect(page.locator('[data-guide-title]')).toBeVisible();
	await page.getByRole('button', { name: 'STRATO' }).click();
	await expect(page.getByRole('button', { name: 'STRATO' })).toHaveAttribute('aria-pressed', 'true');
	await expect(page.locator('.gstep').first()).toBeVisible();
	await page.getByRole('button', { name: '‹ Zurück zum Ergebnis' }).click();

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
	// Server-rendered: the stations are in the HTML even without JavaScript.
	const html = await (await shared.request.get(url)).text();
	expect(html.match(/role="tab"/g)?.length).toBeGreaterThanOrEqual(6);
	expect(html).toContain('Hier landet viel im Spam.');
});

test('DNS quick check shows findings for a real domain', async ({ page }) => {
	await page.goto('/dmarc-check');
	await page.getByLabel('Deine Domain').fill('example.com');
	await page.getByRole('button', { name: 'Jetzt prüfen' }).click();
	await expect(page.locator('[data-dns-headline]')).toContainText('example.com');
	await expect(page.locator('[data-dns-findings] .check')).toHaveCount(3);
	await expect(page.locator('[data-dns-findings] .check').first()).toContainText('DMARC');
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
