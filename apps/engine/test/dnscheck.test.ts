import { describe, expect, it } from 'vitest';
import { countSpfLookups, dnsCheck, normalizeDomain } from '../src/dnscheck.ts';
import { fakeResolver } from './helpers.ts';

const txt = (v: string) => [[v]];

describe('normalizeDomain', () => {
	it.each([
		['Example.DE', 'example.de'],
		['https://www.example.de/kontakt?x=1', 'www.example.de'],
		['max@example.de', 'example.de'],
		['müller-bau.de', 'xn--mller-bau-q9a.de'],
		['example.de.', 'example.de'],
	])('%s → %s', (input, out) => expect(normalizeDomain(input)).toBe(out));

	it.each(['', 'localhost', 'nur text', '-x.de', 'a..de', `${'a'.repeat(64)}.de`])('rejects %s', (input) => expect(normalizeDomain(input)).toBeNull());
});

describe('dnsCheck', () => {
	it('reports a fully configured domain', async () => {
		const r = fakeResolver({
			'ok.test TXT': txt('v=spf1 include:_spf.anbieter.test -all'),
			'_spf.anbieter.test TXT': txt('v=spf1 ip4:192.0.2.0/24 include:_spf2.anbieter.test ~all'),
			'_spf2.anbieter.test TXT': txt('v=spf1 ip4:198.51.100.0/24 ~all'),
			'selector1._domainkey.ok.test TXT': txt('v=DKIM1; k=rsa; p=MIIBIjAN'),
			'_dmarc.ok.test TXT': txt('v=DMARC1; p=reject; rua=mailto:d@ok.test'),
		});
		const res = await dnsCheck('ok.test', r);
		expect(res.light).toBe('ok');
		expect(res.findings.map((f) => f.status)).toEqual(['ok', 'ok', 'ok']);
		expect(res.findings[0].raw.lookups).toBe(2);
		expect(res.findings[1].text).toContain('selector1');
	});

	it('flags missing records and suggests DMARC', async () => {
		const res = await dnsCheck('leer.test', fakeResolver());
		expect(res.light).toBe('bad');
		expect(res.headline).toBe('2 Probleme gefunden');
		expect(res.findings.find((f) => f.id === 'dkim')!.status).toBe('warn'); // unknown selector ≠ missing
		expect(res.findings.find((f) => f.id === 'dmarc')!.suggestion?.host).toBe('_dmarc.leer.test');
	});

	it('flags two SPF records, +all and p=none', async () => {
		const two = await dnsCheck('zwei.test', fakeResolver({ 'zwei.test TXT': [['v=spf1 -all'], ['v=spf1 mx -all']] }));
		expect(two.findings[0].title).toBe('Zwei Absender-Einträge');
		const plus = await dnsCheck('plus.test', fakeResolver({ 'plus.test TXT': txt('v=spf1 +all'), '_dmarc.plus.test TXT': txt('v=DMARC1; p=none') }));
		expect(plus.findings[0].title).toBe('Jeder darf senden');
		expect(plus.findings[2].status).toBe('warn');
		expect(plus.findings[2].text).toContain('rua');
	});

	it('counts SPF lookups beyond the limit', async () => {
		const zone: Record<string, unknown> = {};
		for (let i = 0; i < 12; i++) zone[`i${i}.test TXT`] = txt('v=spf1 a ~all');
		const record = `v=spf1 ${Array.from({ length: 6 }, (_, i) => `include:i${i}.test`).join(' ')} ~all`;
		expect(await countSpfLookups(record, fakeResolver(zone))).toBeGreaterThan(10);
	});

	it('uses a given DKIM selector', async () => {
		const res = await dnsCheck('x.test', fakeResolver({ 'meins._domainkey.x.test TXT': txt('v=DKIM1; p=') }), 'meins');
		expect(res.findings[1].title).toBe('Schlüssel gesperrt');
	});
});
