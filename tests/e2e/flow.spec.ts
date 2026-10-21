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
	await expect(page.locator('[data-score]')).toHaveText(/^\d+,\d$/);
	await expect(page.locator('[data-band]')).toHaveText('Hohes Risiko');
	await expect(page.locator('[data-auth-warning]')).toBeVisible();
	await expect(page.locator('[data-subs] .sub-row')).toHaveCount(3);
	await expect(page.locator('.action.is-bad').first()).toBeVisible();
	await expect(page.locator('.action-gain').first()).toHaveText(/^\+\d+,\d Pkt\.$/);
	await expect(page.locator('[data-mh-from]')).toHaveText('max@example.com');

	// The biggest fix comes first and is open with a guide button.
	await page.getByRole('button', { name: 'Anleitung für deinen Anbieter' }).first().click();
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
	await expect(shared.locator('[data-score]')).toHaveText(await page.locator('[data-score]').innerText());
	await expect(shared.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
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
