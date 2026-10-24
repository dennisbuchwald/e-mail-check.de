import { describe, expect, it } from 'vitest';
import { proTipsOf, renderResultView, type MailResult } from '@emc/shared';
import { analyzeMessage, type AnalyzeDeps } from '../src/analyze.ts';
import { createApi } from '../src/api.ts';
import { checkSecurity } from '../src/checks/security.ts';
import { TestService } from '../src/service.ts';
import { Store } from '../src/store.ts';
import { buildQuery, parseAnswer, type SecLookup } from '../src/dnssec.ts';
import { fakeResolver, fixture, GOOD_IP } from './helpers.ts';

/** Response to buildQuery(id, name, type): header flags, the question copied, then the given answer types. */
function response(query: Buffer, flags: number, answerTypes: number[]): Buffer {
	const head = Buffer.from(query.subarray(0, 12));
	head.writeUInt16BE(flags, 2);
	head.writeUInt16BE(answerTypes.length, 6);
	head.writeUInt16BE(0, 10);
	const question = query.subarray(12, query.length - 11); // without the OPT record
	const answers = answerTypes.map((t) => {
		const rr = Buffer.alloc(12 + 3);
		rr.writeUInt16BE(0xc00c, 0); // pointer to the question name
		rr.writeUInt16BE(t, 2);
		rr.writeUInt16BE(1, 4);
		rr.writeUInt32BE(300, 6);
		rr.writeUInt16BE(3, 10);
		rr.set([3, 1, 1], 12);
		return rr;
	});
	return Buffer.concat([head, question, ...answers]);
}

describe('dnssec query', () => {
	it('asks with RD, AD and the DO bit', () => {
		const q = buildQuery(0x1234, '_25._tcp.mx.example.de', 'TLSA');
		expect(q.readUInt16BE(0)).toBe(0x1234);
		expect(q.readUInt16BE(2)).toBe(0x0120);
		expect(q.readUInt16BE(10)).toBe(1);
		expect(q.subarray(-11).readUInt16BE(1)).toBe(41); // OPT
		expect(q.subarray(-11).readUInt16BE(7) & 0x8000).toBe(0x8000); // DO
	});
	it('reads the AD flag and counts only answers of the asked type', () => {
		const q = buildQuery(7, 'mx.example.de', 'TLSA');
		expect(parseAnswer(response(q, 0x81a0, [52, 46]), 7, 'TLSA')).toEqual({ rcode: 0, ad: true, count: 1 });
		expect(parseAnswer(response(q, 0x8180, []), 7, 'TLSA')).toEqual({ rcode: 0, ad: false, count: 0 });
		expect(parseAnswer(response(q, 0x8183, []), 7, 'TLSA').rcode).toBe(3);
	});
	it('rejects an answer to another query', () => {
		const q = buildQuery(7, 'mx.example.de', 'MX');
		expect(() => parseAnswer(response(q, 0x8180, []), 8, 'MX')).toThrow();
	});
	it('refuses names that cannot be valid', () => {
		expect(() => buildQuery(1, `${'a'.repeat(64)}.de`, 'MX')).toThrow();
	});
});

const zone = {
	'sicher.test MX': [{ exchange: 'mx1.sicher.test', priority: 10 }, { exchange: 'mx2.sicher.test.', priority: 20 }],
	'_mta-sts.sicher.test TXT': [['v=STSv1; id=20261023']],
	'_smtp._tls.sicher.test TXT': [['v=TLSRPTv1; rua=mailto:tls@sicher.test']],
	'offen.test MX': [{ exchange: 'mx00.ionos.de', priority: 10 }],
};
const lookupFor = (ad: boolean, tlsa: number): SecLookup => async (_name, type) => ({ rcode: 0, ad, count: type === 'TLSA' ? tlsa : 1 });

describe('checkSecurity', () => {
	it('signed zone with TLSA on every MX is DANE, records are read', async () => {
		const s = await checkSecurity('sicher.test', fakeResolver(zone), lookupFor(true, 1));
		expect(s).toEqual({
			domain: 'sicher.test',
			dnssec: 'signed',
			mx: [
				{ host: 'mx1.sicher.test', tlsa: 1, dane: true },
				{ host: 'mx2.sicher.test', tlsa: 1, dane: true },
			],
			mtaSts: 'v=STSv1; id=20261023',
			tlsRpt: 'v=TLSRPTv1; rua=mailto:tls@sicher.test',
			bimi: { record: null, logo: false, vmc: false },
		});
	});
	it('TLSA without validation is not DANE', async () => {
		const s = await checkSecurity('sicher.test', fakeResolver(zone), lookupFor(false, 2));
		expect(s.dnssec).toBe('unsigned');
		expect(s.mx.every((m) => m.tlsa === 2 && !m.dane)).toBe(true);
	});
	it('a resolver failure means "not checkable", never "unsigned"', async () => {
		const failing: SecLookup = async () => ({ rcode: 2, ad: false, count: 0 });
		const s = await checkSecurity('offen.test', fakeResolver(zone), failing);
		expect(s.dnssec).toBeNull();
		const timeouts: SecLookup = async () => {
			throw new Error('timeout');
		};
		const t = await checkSecurity('offen.test', fakeResolver(zone), timeouts);
		expect(t.dnssec).toBeNull();
		expect(t.mx).toEqual([{ host: 'mx00.ionos.de', tlsa: 0, dane: false }]);
	});
});

const deps: AnalyzeDeps = { resolver: fakeResolver(zone), mta: 'mx.test', resultTtlDays: 7, scanContent: async () => ({ score: 0, symbols: [] }) };
const analyze = (d: Partial<AnalyzeDeps>) =>
	analyzeMessage(fixture('gut.eml'), { ip: GOOD_IP, helo: 'mail.gut.example.test', sender: 'max@gut.example.test', tls: { version: 'TLSv1.3' } }, 'k7m2x9qa@test.e-mail-check.de', { ...deps, ...d }, () => {});

describe('bonus checks in the result', () => {
	it('never change the score', async () => {
		const without = await analyze({});
		const unsigned = await analyze({ secLookup: lookupFor(false, 0) });
		expect(without.security).toBeUndefined();
		expect(unsigned.security?.dnssec).toBe('unsigned');
		expect(unsigned.score).toBe(without.score);
		expect(unsigned.findings).toEqual(without.findings);
	});
	it('give tips for what is missing, and the nerd area lists them', async () => {
		const r = await analyze({ secLookup: lookupFor(false, 0) });
		const titles = proTipsOf(r).map((t) => t.title);
		expect(titles).toEqual(expect.arrayContaining(['Domain signieren (DNSSEC)', 'Verschlüsselung erzwingen (MTA-STS)', 'Berichte über Verschlüsselung (TLS-RPT)']));
		expect(titles).not.toContain('Mailserver festnageln (DANE)');
		const tlsRpt = proTipsOf(r).find((t) => t.title.includes('TLS-RPT'))!;
		expect(tlsRpt.record).toEqual({ type: 'TXT', host: '_smtp._tls', value: 'v=TLSRPTv1; rua=mailto:tls-berichte@gut.example.test', placeholder: 'tls-berichte@gut.example.test' });
		const html = renderResultView(r, { shareUrl: 'https://e-mail-check.de/ergebnis/x' });
		expect(html).toContain('Postfach-Sicherheit von gut.example.test (ohne Punkte)');
		expect(html).toContain('nicht signiert');
	});
	it('no tips for freemail senders, who cannot change the domain', () => {
		const r = {
			fromDomain: 'gmail.com',
			findings: [{ id: 'sender', status: 'warn', title: '', tech: '', text: '', deductions: [], raw: { domain: 'gmail.com', freemail: true } }],
			security: { domain: 'gmail.com', dnssec: 'unsigned', mx: [], mtaSts: null, tlsRpt: null },
		} as unknown as MailResult;
		expect(proTipsOf(r)).toEqual([]);
	});
	it('DANE tip only for mail servers in the own domain', () => {
		const base = { fromDomain: 'sicher.test', findings: [] } as unknown as MailResult;
		const own = { ...base, security: { domain: 'sicher.test', dnssec: 'signed', mx: [{ host: 'mx1.sicher.test', tlsa: 0, dane: false }], mtaSts: 'v=STSv1', tlsRpt: 'v=TLSRPTv1' } } as MailResult;
		const hosted = { ...base, security: { ...own.security!, mx: [{ host: 'mx00.ionos.de', tlsa: 0, dane: false }] } } as MailResult;
		expect(proTipsOf(own).map((t) => t.title)).toEqual(['Mailserver festnageln (DANE)']);
		expect(proTipsOf(hosted)).toEqual([]);
	});
});

describe('/api/dns?topic=sicherheit (the /dnssec-check page)', () => {
	const api = (secLookup?: SecLookup) => {
		const store = new Store(':memory:');
		const service = new TestService({ store, testDomain: 'test.e-mail-check.de', testTtlMinutes: 60, deps });
		return createApi({ service, resolver: fakeResolver(zone), rateLimit: { tests: 3, dns: 5 }, trustProxy: false, clientIp: () => '1.1.1.1', ...(secLookup ? { secLookup } : {}) });
	};
	it('answers four bonus findings without deductions', async () => {
		const res = await api(lookupFor(true, 1)).request('/api/dns?domain=sicher.test&topic=sicherheit');
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.findings.map((f: { id: string; status: string }) => `${f.id}:${f.status}`)).toEqual(['dnssec:ok', 'dane:ok', 'mta-sts:ok', 'tls-rpt:ok']);
		expect(body.findings.every((f: { deductions: unknown[] }) => f.deductions.length === 0)).toBe(true);
		expect(body.light).toBe('ok');
		expect(body.headline).toBe('Rundum abgesichert');
	});
	it('missing protection is a hint with a ready TLS-RPT record, never a problem', async () => {
		const body = await (await api(lookupFor(false, 0)).request('/api/dns?domain=offen.test&topic=sicherheit')).json();
		expect(body.light).toBe('warn');
		expect(body.findings.some((f: { status: string }) => f.status === 'bad')).toBe(false);
		expect(body.findings.find((f: { id: string }) => f.id === 'tls-rpt').suggestion).toEqual({ type: 'TXT', host: '_smtp._tls', value: 'v=TLSRPTv1; rua=mailto:tls-berichte@offen.test' });
		expect(body.headline).toBe('Noch keine Schutzstufe eingerichtet');
	});
	it('without our own resolver the topic is unavailable, the normal check still works', async () => {
		const app = api();
		expect((await app.request('/api/dns?domain=offen.test&topic=sicherheit')).status).toBe(503);
		expect((await app.request('/api/dns?domain=gut.example.test')).status).toBe(200);
	});
});
