import { describe, expect, it } from 'vitest';
import type { MailResult, StepId } from '@emc/shared';
import { analyzeMessage, type AnalyzeDeps } from '../src/analyze.ts';
import { reverseIp } from '../src/checks/reputation.ts';
import { fakeResolver, fixture, GOOD_IP, LISTED_IP } from './helpers.ts';

const deps: AnalyzeDeps = { resolver: fakeResolver(), mta: 'mx.test', resultTtlDays: 7, scanContent: async () => ({ score: 0, symbols: [] }) };

async function run(name: string, opts: { ip?: string; sender?: string; deps?: Partial<AnalyzeDeps> } = {}) {
	const steps: StepId[] = [];
	const msg = fixture(name);
	const from = /From: .*<([^>]+)>/.exec(msg.toString())![1];
	const result = await analyzeMessage(msg, { ip: opts.ip ?? GOOD_IP, helo: 'mail.gut.example.test', sender: opts.sender ?? from, tls: { version: 'TLSv1.3' } }, 'k7m2x9qa@test.e-mail-check.de', { ...deps, ...opts.deps }, (s) => steps.push(s));
	return { result, steps };
}

const find = (r: MailResult, id: string) => r.findings.find((f) => f.id === id)!;

describe('scanWithRspamd', () => {
	it('never keeps message excerpts from rspamd options', async () => {
		const { scanWithRspamd } = await import('../src/checks/content.ts');
		const realFetch = globalThis.fetch;
		globalThis.fetch = (async () =>
			new Response(JSON.stringify({ action: 'no action', symbols: { R_SUSPICIOUS_URL: { name: 'R_SUSPICIOUS_URL', score: 2, description: 'x', options: ['geheim.example/pfad'] } } }))) as typeof fetch;
		try {
			const res = await scanWithRspamd('http://rspamd', Buffer.from(''), { ip: '1.2.3.4', helo: 'h', sender: '' }, 'a@b');
			expect(JSON.stringify(res)).not.toContain('geheim');
		} finally {
			globalThis.fetch = realFetch;
		}
	});
});

describe('analyzeMessage', () => {
	it('rates a clean mail 10/10 and reports every step', async () => {
		const { result, steps } = await run('gut.eml');
		expect(steps).toEqual(['received', 'spf', 'dkim', 'dmarc', 'reputation', 'content']);
		expect(result.findings.map((f) => f.status)).toEqual(['ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok']);
		expect(result.verdict).toEqual({ line1: 'Deine Mail kam sauber an.', line2: 'Jede Station grün.' });
		expect(result.score).toBe(10);
		expect(result.light).toBe('ok');
		expect(result.fromDomain).toBe('gut.example.test');
		expect(result.id).toMatch(/^[\w-]{22}$/);
	});

	it('flags a missing SPF record', async () => {
		const { result } = await run('ohne-spf.eml');
		expect(find(result, 'spf').status).toBe('bad');
		expect(find(result, 'spf').guide).toBe('spf');
		expect(find(result, 'dmarc').status).toBe('ok'); // passes via aligned DKIM
		expect(result.score).toBe(8.5);
		expect(result.findings[0].id).toBe('spf'); // problems first
	});

	it('flags an unsigned mail and DMARC monitor mode', async () => {
		const { result } = await run('ohne-dkim.eml');
		expect(find(result, 'dkim').status).toBe('bad');
		expect(find(result, 'dmarc').status).toBe('warn');
		expect(result.score).toBe(7.8);
		expect(result.light).toBe('bad');
	});

	it('flags a missing DMARC record and suggests a value', async () => {
		const { result } = await run('ohne-dmarc.eml');
		const dmarc = find(result, 'dmarc');
		expect(dmarc.status).toBe('bad');
		expect(dmarc.title).toBe('Schutzregel fehlt');
		expect(dmarc.suggestion).toEqual({ type: 'TXT', host: '_dmarc.ohne-dmarc.example.test', value: 'v=DMARC1; p=none; rua=mailto:dmarc@ohne-dmarc.example.test' });
		expect(result.verdict).toEqual({ line1: 'Deine Mail kommt an, aber nicht überall.', line2: 'Eine Sache solltest du beheben.' });
		expect(result.band).toBe('solid');
		expect(result.authWarning).toBe(true);
		expect(result.findings[0].gain).toBe(1.5);
		expect(result.findings[0].impact).toBe('hoch');
	});

	it('detects a softfail', async () => {
		const { result } = await run('softfail.eml');
		expect(find(result, 'spf').status).toBe('warn');
		expect(find(result, 'dmarc').status).toBe('ok');
	});

	it('detects a broken DKIM signature and the DMARC failure that follows', async () => {
		const { result } = await run('dkim-kaputt.eml');
		expect(find(result, 'dkim').status).toBe('bad');
		expect(find(result, 'dkim').text).toContain('verändert');
		// SPF passes for dkim-kaputt.example.test, so DMARC is still aligned via SPF.
		expect(find(result, 'dmarc').status).toBe('ok');
	});

	it('fails DMARC when nothing aligns', async () => {
		const { result } = await run('ohne-dkim.eml', { ip: '198.51.100.99' });
		expect(find(result, 'spf').status).toBe('bad');
		expect(find(result, 'dmarc').status).toBe('bad');
		expect(find(result, 'dmarc').title).toBe('Schutzregel nicht erfüllt');
	});

	it('detects a blocklisted server', async () => {
		const { result } = await run('sperrliste.eml', { ip: LISTED_IP });
		const rep = find(result, 'reputation');
		expect(rep.status).toBe('bad');
		expect(rep.text).toContain('Spamhaus');
		expect(rep.deductions[0].points).toBe(3);
	});

	it('explains a Spamhaus PBL hit as an end-user connection, not as spam', async () => {
		const resolver = fakeResolver({ [`${reverseIp(GOOD_IP)}.zen.spamhaus.org A`]: ['127.0.0.10'] });
		const { result } = await run('gut.eml', { deps: { resolver } });
		const rep = find(result, 'reputation');
		expect(rep.status).toBe('bad');
		expect(rep.title).toBe('Versand direkt vom Internetanschluss');
		expect(rep.text).toContain('kein Spam-Vorwurf');
		expect(rep.text).not.toContain('austragen lassen');
		expect(rep.deductions[0].points).toBe(3);
	});

	it('skips the reputation check for local senders', async () => {
		const { result } = await run('gut.eml', { ip: '172.18.0.1' });
		expect(find(result, 'reputation').status).toBe('skip');
	});

	it('maps a spammy content score', async () => {
		const scanContent = async () => ({ score: 9.4, symbols: [{ name: 'SUBJ_ALL_CAPS', score: 3.4 }, { name: 'GTUBE', score: 6 }] });
		const { result } = await run('spam.eml', { deps: { scanContent } });
		const content = find(result, 'content');
		expect(content.status).toBe('bad');
		expect(content.text).toContain('Spam-Testmuster');
		expect(content.text).toContain('Großbuchstaben');
		expect(content.deductions[0].points).toBe(4);
	});

	it('survives an unreachable content scanner', async () => {
		const scanContent = async () => {
			throw new Error('ECONNREFUSED');
		};
		const { result } = await run('gut.eml', { deps: { scanContent } });
		expect(find(result, 'content').status).toBe('skip');
		expect(result.score).toBe(10);
	});
});
