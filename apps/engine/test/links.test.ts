import { describe, expect, it } from 'vitest';
import { extractLinks, isShortener, summarizeLinks } from '../src/checks/links.ts';
import { analyzeUnsubscribe } from '../src/checks/unsubscribe.ts';
import { contentFinding, ownContentChecks } from '../src/checks/content.ts';
import { analyzeMessage, bodyStats } from '../src/analyze.ts';
import { fakeResolver, GOOD_IP } from './helpers.ts';

describe('extractLinks', () => {
	it('finds href and plain-text links, decodes entities, dedupes', () => {
		const html = '<a href="https://a.example/x?y=1&amp;z=2">A</a> <a href="mailto:x@y.de">M</a> <a href=\'https://a.example/x?y=1&z=2\'>dup</a>';
		const text = 'Mehr unter https://b.example/info. Oder http://c.example)';
		expect(extractLinks(html, text)).toEqual(['https://a.example/x?y=1&z=2', 'https://b.example/info', 'http://c.example']);
	});
});

describe('isShortener', () => {
	it.each([
		['https://bit.ly/abc', true],
		['https://www.tinyurl.com/x', true],
		['https://bitly.example.de/', false],
		['https://deine-domain.de', false],
	])('%s → %s', (u, r) => expect(isShortener(u)).toBe(r));
});

describe('summarizeLinks', () => {
	it('counts links and domains and finds shorteners without requesting anything', () => {
		const r = summarizeLinks(['https://a.example/x', 'https://www.a.example/y', 'https://bit.ly/abc', 'https://b.example/abmelden']);
		expect(r).toEqual({ total: 4, domains: 3, shorteners: ['bit.ly'], hasUnsubscribeLink: true });
	});
	it('has no network code at all', async () => {
		const src = (await import('node:fs')).readFileSync(new URL('../src/checks/links.ts', import.meta.url), 'utf8');
		expect(src).not.toMatch(/node:https?|fetch\(|\.request\(/);
	});
});

describe('analyzeUnsubscribe', () => {
	it('treats a personal mail as not bulk', () => {
		expect(analyzeUnsubscribe([['from', 'Max <max@x.de>']], false)).toEqual({ bulk: false, header: false, oneClick: false });
	});
	it('detects a newsletter without header', () => {
		expect(analyzeUnsubscribe([['list-id', '<news.x.de>']], false).bulk).toBe(true);
		expect(analyzeUnsubscribe([], true)).toEqual({ bulk: true, header: false, oneClick: false });
	});
	it('detects RFC 8058 one-click', () => {
		const r = analyzeUnsubscribe(
			[
				['list-unsubscribe', '<https://x.de/u?id=1>, <mailto:u@x.de>'],
				['list-unsubscribe-post', 'List-Unsubscribe=One-Click'],
			],
			false,
		);
		expect(r).toEqual({ bulk: true, header: true, oneClick: true });
	});
	it('treats a designed HTML mail with many links as a newsletter', () => {
		expect(analyzeUnsubscribe([], false, { links: 8, html: true }).bulk).toBe(true);
		expect(analyzeUnsubscribe([], false, { links: 8, html: false }).bulk).toBe(false);
		expect(analyzeUnsubscribe([], false, { links: 3, html: true }).bulk).toBe(false);
	});
});

describe('contentFinding with links, newsletter and body checks', () => {
	const clean = { score: 0, symbols: [] };
	const noLinks = { total: 0, domains: 0, shorteners: [], hasUnsubscribeLink: false };
	const body = (o: Partial<{ words: number; images: number; hasHtml: boolean; hasText: boolean; htmlChars: number }> = {}) => ({ words: 120, images: 0, hasHtml: true, hasText: true, htmlChars: 2000, ...o });

	it('warns about shorteners and deducts points', () => {
		const f = contentFinding(clean, { links: { ...noLinks, total: 3, domains: 2, shorteners: ['bit.ly'] } });
		expect(f.status).toBe('warn');
		expect(f.text).toContain('bit.ly');
		expect(f.deductions.map((d) => d.points)).toEqual([0.5]);
	});

	it('gives a newsletter without List-Unsubscribe a small hint', () => {
		const f = contentFinding(clean, { links: noLinks, unsubscribe: { bulk: true, header: false, oneClick: false } });
		expect(f.status).toBe('warn');
		expect(f.text).toContain('Abmelde-Link im Header');
		expect(f.deductions).toEqual([{ reason: 'Abmelde-Link im Header fehlt', points: 0.3 }]);
	});

	it('only gives a tip without points when one-click is missing, and says when it is right', () => {
		const tip = contentFinding(clean, { links: noLinks, unsubscribe: { bulk: true, header: true, oneClick: false } });
		expect(tip.status).toBe('warn');
		expect(tip.deductions).toEqual([]);
		const good = ownContentChecks(clean, { unsubscribe: { bulk: true, header: true, oneClick: true } });
		expect(good).toEqual([expect.objectContaining({ id: 'one-click', status: 'ok' })]);
	});

	it('flags an image-only mail, but does not count it twice when rspamd already did', () => {
		expect(ownContentChecks(clean, { body: body({ images: 1, words: 3 }) })[0]).toMatchObject({ id: 'image-only', points: 0.3 });
		const rspamdSawIt = { score: 1.2, symbols: [{ name: 'R_SUSPICIOUS_IMAGES', score: 1.2 }] };
		expect(ownContentChecks(rspamdSawIt, { body: body({ images: 1, words: 3 }) })[0]).toMatchObject({ id: 'image-only', points: 0 });
	});

	it('flags little text in a lot of HTML, a missing text part, and notes very short mails without points', () => {
		const checks = ownContentChecks(clean, { body: body({ htmlChars: 8000, words: 40, hasText: false }) });
		expect(checks.map((c) => [c.id, c.points])).toEqual([['low-text', 0.2], ['html-only', 0]]);
		expect(ownContentChecks(clean, { body: body({ words: 4, hasHtml: false }) })).toEqual([expect.objectContaining({ id: 'short', status: 'info', points: 0 })]);
		// A very short test mail alone does not turn the station orange.
		expect(contentFinding(clean, { body: body({ words: 4, hasHtml: false }) }).status).toBe('ok');
	});

	it('tips on what the sender can change, not on mail program quirks', () => {
		// Real Apple Mail result: subject "TEST" plus Apple's own "Mime-Version" spelling.
		const apple = { score: 0.7, symbols: [{ name: 'MV_CASE', score: 0.5 }, { name: 'SUBJ_ALL_CAPS', score: 0.3 }, { name: 'MIME_GOOD', score: -0.1 }] };
		const f = contentFinding(apple, { links: noLinks });
		expect(f.status).toBe('ok');
		expect(f.text).toContain('Großbuchstaben');
		expect(f.text).not.toContain('Kopfeintrag');
	});

	it('still reports link problems when the spam filter is down', () => {
		const f = contentFinding(null, { error: 'ECONNREFUSED', links: { ...noLinks, shorteners: ['bit.ly'] } });
		expect(f.status).toBe('warn');
		expect(f.text).toContain('nicht erreichbar');
	});
});

describe('bodyStats', () => {
	it('counts words and images and sees a missing text part', async () => {
		const { simpleParser } = await import('mailparser');
		const html = Buffer.from('From: a@x.de\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=utf-8\r\n\r\n<p>Hallo Welt</p><img src="cid:x">\r\n');
		const st = bodyStats(await simpleParser(html), html)!;
		expect(st).toMatchObject({ words: 2, images: 1, hasHtml: true, hasText: false });
		const plain = Buffer.from('From: a@x.de\r\n\r\nNur Text hier\r\n');
		expect(bodyStats(await simpleParser(plain), plain)).toMatchObject({ words: 3, hasHtml: false, hasText: true });
	});
});

describe('analyzeMessage with a newsletter', () => {
	it('reads links and List-Unsubscribe end to end, never stores paths', async () => {
		const msg = Buffer.from(
			[
				'From: News <news@gut.example.test>',
				'To: k7m2x9qa@test.e-mail-check.de',
				'Subject: Oktober-News',
				'Date: Tue, 20 Oct 2026 10:00:00 +0200',
				'Message-ID: <n1@gut.example.test>',
				'List-Id: <news.gut.example.test>',
				'MIME-Version: 1.0',
				'Content-Type: text/html; charset=utf-8',
				'',
				'<p>Neu in unserem Blog und im Shop, mit vielen Ideen für den Herbst und einem Angebot für dich: <a href="https://gut.example.test/blog">Blog</a>, <a href="https://bit.ly/abc">Angebot</a>, <a href="https://alt.example.test/x">Alt</a></p>',
				'',
			].join('\r\n'),
		);
		const r = await analyzeMessage(msg, { ip: GOOD_IP, helo: 'mail.gut.example.test', sender: 'news@gut.example.test' }, 'k7m2x9qa@test.e-mail-check.de', { resolver: fakeResolver(), mta: 'mx.test', resultTtlDays: 7, scanContent: async () => ({ score: 0, symbols: [] }) }, () => {});
		const content = r.findings.find((f) => f.id === 'content')!;
		expect(content.status).toBe('warn');
		expect(content.text).toContain('bit.ly');
		expect(content.text).toContain('Abmelde-Link im Header');
		expect(content.deductions.reduce((s, d) => s + d.points, 0)).toBe(0.8);
		expect((content.raw as { links: unknown }).links).toEqual({ total: 3, domains: 3, shorteners: ['bit.ly'] });
		// Never store paths or full URLs from the mail.
		expect(JSON.stringify(r)).not.toContain('/blog');
		expect(JSON.stringify(r)).not.toContain('bit.ly/abc');
		expect(JSON.stringify(r)).not.toContain('alt.example.test');
	});
});
