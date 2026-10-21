import { describe, expect, it } from 'vitest';
import { checkLinks, extractLinks, isPublicIp, isShortener, probeUrl } from '../src/checks/links.ts';
import { analyzeUnsubscribe } from '../src/checks/unsubscribe.ts';
import { contentFinding } from '../src/checks/content.ts';
import { analyzeMessage } from '../src/analyze.ts';
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

describe('isPublicIp', () => {
	it.each(['127.0.0.1', '10.1.2.3', '172.28.0.53', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1', '203.0.113.5'])(
		'blocks %s',
		(ip) => expect(isPublicIp(ip)).toBe(false),
	);
	it.each(['167.235.225.13', '8.8.8.8', '2a01:4f8:1c17:677f::1'])('allows %s', (ip) => expect(isPublicIp(ip)).toBe(true));
});

describe('probeUrl SSRF guard', () => {
	const resolver = fakeResolver({
		'intern.example A': ['127.0.0.1'],
		'metadata.example A': ['169.254.169.254'],
		'rebind.example A': ['8.8.8.8', '10.0.0.1'],
		'rspamd.example A': ['172.28.0.2'],
	});
	it.each([
		['http://intern.example/admin', 'blocked'],
		['http://metadata.example/latest/meta-data', 'blocked'],
		['http://rebind.example/', 'blocked'],
		['http://rspamd.example:11333/checkv2', 'blocked'],
		['http://127.0.0.1/', 'blocked'],
		['http://[::1]/', 'blocked'],
		['ftp://example.org/file', 'blocked'],
		['https://user:pw@example.org/', 'blocked'],
		['https://gibts-nicht.example/', 'nxdomain'],
	])('%s → %s', async (url, expected) => {
		expect(await probeUrl(url, resolver, 500)).toEqual({ error: expected });
	});
});

describe('checkLinks', () => {
	it('reports dead hosts only (no paths), skips unsubscribe links, respects the limit', async () => {
		const probed: string[] = [];
		const probe = async (u: string) => {
			probed.push(u);
			if (u.includes('weg.example')) return { status: 404 };
			if (u.includes('nx.example')) return { error: 'nxdomain' as const };
			if (u.includes('cf.example')) return { status: 403 };
			return { status: 200 };
		};
		const links = ['https://ok.example/', 'https://weg.example/geheim/pfad', 'https://nx.example/', 'https://cf.example/', 'https://news.example/abmelden?id=1', 'https://bit.ly/x'];
		const r = await checkLinks(links, { resolve: fakeResolver(), probe, maxLinks: 10 });
		expect(r.dead).toEqual([
			{ host: 'weg.example', reason: 'Seite nicht gefunden (404)' },
			{ host: 'nx.example', reason: 'Domain existiert nicht' },
		]);
		expect(JSON.stringify(r)).not.toContain('geheim');
		expect(probed).not.toContain('https://news.example/abmelden?id=1');
		expect(r.hasUnsubscribeLink).toBe(true);
		expect(r.shorteners).toEqual(['bit.ly']);
		const limited = await checkLinks(links, { resolve: fakeResolver(), probe: async () => ({ status: 200 }), maxLinks: 2 });
		expect(limited.checked).toBe(2);
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
});

describe('contentFinding with links and newsletter checks', () => {
	const clean = { score: 0, symbols: [] };
	const noLinks = { total: 0, checked: 0, dead: [], shorteners: [], hasUnsubscribeLink: false };

	it('warns about dead links and shorteners and deducts points', () => {
		const f = contentFinding(clean, { links: { ...noLinks, total: 3, checked: 3, dead: [{ host: 'weg.example', reason: 'Seite nicht gefunden (404)' }], shorteners: ['bit.ly'] } });
		expect(f.status).toBe('warn');
		expect(f.text).toContain('weg.example');
		expect(f.text).toContain('bit.ly');
		expect(f.deductions.map((d) => d.points)).toEqual([0.5, 0.5]);
	});

	it('warns a newsletter without List-Unsubscribe', () => {
		const f = contentFinding(clean, { links: noLinks, unsubscribe: { bulk: true, header: false, oneClick: false } });
		expect(f.status).toBe('warn');
		expect(f.text).toContain('List-Unsubscribe');
	});

	it('only gives a tip when one-click is missing, praises it when present', () => {
		const tip = contentFinding(clean, { links: noLinks, unsubscribe: { bulk: true, header: true, oneClick: false } });
		expect(tip.status).toBe('ok');
		expect(tip.deductions).toEqual([]);
		expect(tip.text).toContain('Tipp');
		const good = contentFinding(clean, { links: { ...noLinks, checked: 4 }, unsubscribe: { bulk: true, header: true, oneClick: true } });
		expect(good.text).toContain('Alle 4 geprüften Links funktionieren');
		expect(good.text).toContain('Klick');
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

describe('analyzeMessage with a newsletter', () => {
	it('checks links and List-Unsubscribe end to end', async () => {
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
				'<p>Neu: <a href="https://gut.example.test/blog">Blog</a>, <a href="https://bit.ly/abc">Angebot</a>, <a href="https://alt.example.test/x">Alt</a></p>',
				'',
			].join('\r\n'),
		);
		const probe = async (u: string) => (u.includes('alt.example.test') ? { status: 410 } : { status: 200 });
		const r = await analyzeMessage(msg, { ip: GOOD_IP, helo: 'mail.gut.example.test', sender: 'news@gut.example.test' }, 'k7m2x9qa@test.e-mail-check.de', { resolver: fakeResolver(), mta: 'mx.test', resultTtlDays: 7, scanContent: async () => ({ score: 0, symbols: [] }), linkProbe: probe }, () => {});
		const content = r.findings.find((f) => f.id === 'content')!;
		expect(content.status).toBe('warn');
		expect(content.text).toContain('alt.example.test');
		expect(content.text).toContain('bit.ly');
		expect(content.text).toContain('List-Unsubscribe');
		expect(content.deductions.reduce((s, d) => s + d.points, 0)).toBe(1.5);
		// Never store paths or full URLs from the mail.
		expect(JSON.stringify(r)).not.toContain('/blog');
		expect(JSON.stringify(r)).not.toContain('bit.ly/abc');
	});
});
