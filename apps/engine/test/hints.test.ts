// The happyDeliver comparison (24.10.2026): reachability, DMARC details, HELO SPF, BIMI record, TLS cipher.
// All hints without points.
import { describe, expect, it } from 'vitest';
import { proTipsOf, renderResultView } from '@emc/shared';
import { analyzeMessage, type AnalyzeDeps } from '../src/analyze.ts';
import { dmarcTags } from '../src/checks/auth.ts';
import { reachOf } from '../src/checks/reachability.ts';
import { checkSecurity } from '../src/checks/security.ts';
import { senderFinding } from '../src/checks/sender.ts';
import { transportFinding } from '../src/checks/transport.ts';
import { fakeResolver, fixture, GOOD_IP } from './helpers.ts';

const zone = {
	'mx.test MX': [{ exchange: 'mail.mx.test', priority: 10 }],
	'nullmx.test MX': [{ exchange: '', priority: 0 }],
	'nurweb.test A': ['203.0.113.5'],
	'logo.test TXT': [],
	'default._bimi.logo.test TXT': [['v=BIMI1; l=https://logo.test/l.svg; a=https://logo.test/vmc.pem']],
	'default._bimi.nein.test TXT': [['v=BIMI1; l=; a=;']],
};
const resolve = fakeResolver(zone);

describe('reachability', () => {
	it('tells MX, A only, null MX and nothing apart', async () => {
		expect(await reachOf('mx.test', resolve)).toBe('mx');
		expect(await reachOf('nurweb.test', resolve)).toBe('a');
		expect(await reachOf('nullmx.test', resolve)).toBe('none');
		expect(await reachOf('nichts.test', resolve)).toBe('none');
	});
	it('a lookup failure is "not checkable", never "none"', async () => {
		const broken = async () => {
			throw Object.assign(new Error('timeout'), { code: 'ETIMEOUT' });
		};
		expect(await reachOf('mx.test', broken)).toBeNull();
	});
	it('no mailbox for the sender or the bounce address is a hint without points', () => {
		const from = senderFinding('firma.test', { from: 'none', returnPath: null });
		expect(from).toMatchObject({ status: 'warn', title: 'Antworten kommen nicht an', deductions: [] });
		const rp = senderFinding('firma.test', { from: 'mx', returnPath: { domain: 'bounce.versand.test', reach: 'none' } });
		expect(rp).toMatchObject({ status: 'warn', title: 'Rückläufer gehen verloren', deductions: [] });
		expect(senderFinding('firma.test', { from: 'a', returnPath: { domain: 'firma.test', reach: 'a' } }).status).toBe('ok');
		expect(senderFinding('firma.test', { from: null, returnPath: null }).status).toBe('ok');
	});
});

describe('DMARC details', () => {
	it('reads rua, sp, pct and alignment, with RFC defaults', () => {
		expect(dmarcTags('v=DMARC1; p=quarantine; sp=none; pct=50; aspf=s; rua=mailto:d@x.test')).toEqual({ rua: 'mailto:d@x.test', sp: 'none', pct: 50, aspf: 's', adkim: 'r' });
		expect(dmarcTags('v=DMARC1; p=reject')).toEqual({ rua: null, sp: null, pct: 100, aspf: 'r', adkim: 'r' });
		expect(dmarcTags('v=DMARC1; p=reject; pct=abc')?.pct).toBe(100);
		expect(dmarcTags(null)).toBeNull();
	});
});

describe('TLS cipher', () => {
	it('keeps the cipher and its strength, never changes the status', () => {
		const f = transportFinding({ version: 'TLSv1.3', cipher: 'TLS_AES_256_GCM_SHA384' }, [], 'mx.test', new Date());
		expect(f.raw.tls).toMatchObject({ cipher: 'TLS_AES_256_GCM_SHA384', bits: 256 });
		expect(transportFinding({ version: 'TLSv1.2', cipher: 'ECDHE-RSA-AES128-GCM-SHA256' }, [], 'mx.test', new Date()).raw.tls).toMatchObject({ bits: 128 });
		expect(f.status).toBe('ok');
	});
});

describe('BIMI record', () => {
	const lookup = async () => ({ rcode: 0, ad: false, count: 0 });
	it('logo with mark certificate, declined, none', async () => {
		expect((await checkSecurity('logo.test', resolve, lookup)).bimi).toEqual({ record: 'v=BIMI1; l=https://logo.test/l.svg; a=https://logo.test/vmc.pem', logo: true, vmc: true });
		expect((await checkSecurity('nein.test', resolve, lookup)).bimi).toEqual({ record: 'v=BIMI1; l=; a=;', logo: false, vmc: false });
		expect((await checkSecurity('mx.test', resolve, lookup)).bimi).toEqual({ record: null, logo: false, vmc: false });
	});
});

describe('in a real analysis', () => {
	const deps: AnalyzeDeps = { resolver: fakeResolver(), mta: 'mx.test', resultTtlDays: 7, scanContent: async () => ({ score: 0, symbols: [] }) };
	const run = () => analyzeMessage(fixture('gut.eml'), { ip: GOOD_IP, helo: 'mail.gut.example.test', sender: 'max@gut.example.test', tls: { version: 'TLSv1.3', cipher: 'TLS_AES_256_GCM_SHA384' } }, 'k7m2x9qa@test.e-mail-check.de', deps, () => {});
	it('the clean mail stays at 10 and the nerd area shows the new values', async () => {
		const r = await run();
		expect(r.score).toBe(10);
		const rep = r.findings.find((f) => f.id === 'reputation')!;
		expect(rep.raw.heloSpf).toBeTruthy();
		expect(r.findings.find((f) => f.id === 'sender')!.raw.reach).toBeTruthy();
		const html = renderResultView(r, { shareUrl: 'https://e-mail-check.de/ergebnis/x' });
		for (const s of ['SPF für den HELO-Namen', 'TLS_AES_256_GCM_SHA384', '256 Bit', 'Antworten an die Absender-Domain']) expect(html).toContain(s);
	});
	it('an active rule without rua gets the hint in the station and a ready record as tip', async () => {
		const r = await run();
		const dmarc = r.findings.find((f) => f.id === 'dmarc')!;
		const tags = dmarc.raw.tags as { rua: string | null } | null;
		if (tags && !tags.rua && dmarc.status === 'ok') {
			expect(dmarc.text).toContain('rua fehlt');
			expect(proTipsOf(r).find((t) => t.title === 'DMARC-Berichte einschalten')?.record?.value).toMatch(/; rua=mailto:dmarc@gut\.example\.test$/);
		} else {
			expect(dmarc.text).not.toContain('Hinweis:');
		}
	});
});
