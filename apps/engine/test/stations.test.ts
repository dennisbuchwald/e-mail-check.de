import { describe, expect, it } from 'vitest';
import { initialStation, isFreemail, ruleTitle, stationsOf, type Finding } from '@emc/shared';
import { analyzeMessage } from '../src/analyze.ts';
import { senderFinding } from '../src/checks/sender.ts';
import { parseHops, transportFinding } from '../src/checks/transport.ts';
import { fakeResolver, fixture, GOOD_IP } from './helpers.ts';

describe('freemail', () => {
	it('knows the common providers and nothing else', () => {
		for (const d of ['gmail.com', 'icloud.com', 'gmx.de', 'web.de', 't-online.de', 'outlook.com', 'posteo.de', 'proton.me', 'ICLOUD.COM']) expect(isFreemail(d), d).toBe(true);
		for (const d of ['dbw-media.de', 'example.com', 'gmail.example.test', null]) expect(isFreemail(d)).toBe(false);
	});
	it('is a hint with 0.2 points, not a problem', () => {
		const f = senderFinding('icloud.com');
		expect(f.status).toBe('warn');
		expect(f.deductions).toEqual([{ reason: 'Freemail-Absender', points: 0.2 }]);
		expect(f.text).toContain('eigenen Domain');
		expect(senderFinding('dbw-media.de').status).toBe('ok');
		expect(senderFinding(null).status).toBe('skip');
	});
});

describe('transport', () => {
	const at = new Date('2026-10-20T08:00:13Z');
	const received = [
		'from outbound.mr.icloud.com by mr-2004c.eps.apple.com (Postfix) with ESMTPS id 4c1; Tue, 20 Oct 2026 10:00:10 +0200',
		'from [192.168.1.20] by p00-icloudmta-asmtp.me.com (Postfix) with ESMTPSA id 9a2; Tue, 20 Oct 2026 10:00:08 +0200',
	];
	it('builds the chain oldest first, keeps only server names and adds our receipt', () => {
		const { hops, durationSec } = parseHops(received, 'mx.e-mail-check.de', at);
		expect(hops).toEqual([
			{ host: 'p00-icloudmta-asmtp.me.com', sec: 0 },
			{ host: 'mr-2004c.eps.apple.com', sec: 2 },
			{ host: 'mx.e-mail-check.de', sec: 5 },
		]);
		expect(durationSec).toBe(5);
		expect(JSON.stringify(hops)).not.toContain('192.168');
	});
	it('rates TLS 1.3 ok, old TLS and no TLS as hints', () => {
		expect(transportFinding({ version: 'TLSv1.3' }, received, 'mx', at)).toMatchObject({ status: 'ok', deductions: [] });
		expect(transportFinding({ version: 'TLSv1' + '.1' }, [], 'mx', at)).toMatchObject({ status: 'warn', deductions: [{ points: 0.2 }] });
		expect(transportFinding(null, [], 'mx', at)).toMatchObject({ status: 'warn', deductions: [{ points: 0.5 }] });
	});
});

describe('stations', () => {
	const f = (id: Finding['id'], status: Finding['status'], points = 0): Finding => ({ id, status, title: id, tech: id, text: '', deductions: points ? [{ reason: id, points }] : [], raw: {} });
	it('groups findings into six stations, worst status wins, skip only if nothing was checked', () => {
		const st = stationsOf([f('spf', 'ok'), f('sender', 'warn', 0.2), f('dkim', 'ok'), f('dmarc', 'bad', 2.5), f('reputation', 'ok'), f('content', 'skip')]);
		expect(st.map((s) => [s.id, s.status, s.gain])).toEqual([
			['absender', 'warn', 0.2],
			['unterschrift', 'ok', 0],
			['schutzregel', 'bad', 2.5],
			['serverruf', 'ok', 0],
			['transport', 'skip', 0],
			['posteingang', 'skip', 0],
		]);
		expect(initialStation(st)).toBe(2);
	});
	it('opens the first hint if there is no problem, else station 1', () => {
		expect(initialStation(stationsOf([f('spf', 'ok'), f('dkim', 'ok'), f('dmarc', 'warn')]))).toBe(2);
		expect(initialStation(stationsOf([f('spf', 'ok')]))).toBe(0);
	});
	it('translates rspamd rules and keeps unknown names', () => {
		expect(ruleTitle('SUBJ_ALL_CAPS')).toBe('Betreff in Großbuchstaben');
		expect(ruleTitle('SOME_NEW_RULE')).toBe('SOME_NEW_RULE');
	});
});

describe('end to end: freemail sender like a real iCloud mail', () => {
	it('scores 9.8 with one hint at the sender station, chain from the Received headers', async () => {
		const r = await analyzeMessage(fixture('freemail.eml'), { ip: GOOD_IP, helo: 'mail.gut.example.test', sender: 'max.muster@icloud.com', tls: { version: 'TLSv1.3' } }, 'k7m2x9qa@test.e-mail-check.de', { resolver: fakeResolver(), mta: 'mx.e-mail-check.de', resultTtlDays: 7, scanContent: async () => ({ score: 0.7, symbols: [{ name: 'SUBJ_ALL_CAPS', score: 0.3 }, { name: 'MV_CASE', score: 0.5 }, { name: 'MIME_GOOD', score: -0.1 }] }), now: () => new Date('2026-10-20T08:00:13Z') }, () => {});
		expect(r.score).toBe(9.8);
		const st = stationsOf(r.findings);
		expect(st.map((s) => s.status)).toEqual(['warn', 'ok', 'ok', 'ok', 'ok', 'ok']);
		expect(r.verdict).toEqual({ line1: 'Deine Mail kam sauber an.', line2: 'Ein Tipp für die letzte Stufe.' });
		const hops = (r.findings.find((x) => x.id === 'transport')!.raw as { hops: { host: string }[] }).hops.map((h) => h.host);
		expect(hops).toEqual(['p00-icloudmta-asmtp.me.com', 'mr-2004c.eps.apple.com', 'mx.e-mail-check.de']);
	});
});

describe('server reputation extras', () => {
	it('compares the HELO name and keeps positive lists apart from blocklists', async () => {
		const { checkReputation, reverseIp } = await import('../src/checks/reputation.ts');
		const lists = [
			{ name: 'Test-Sperrliste', zone: 'bl.example.test', major: false, ipv6: false, delistUrl: 'https://bl.example.test' },
			{ name: 'Test-Positivliste', zone: 'wl.example.test', major: false, ipv6: false, allow: true, delistUrl: 'https://wl.example.test' },
		];
		const resolver = fakeResolver({ [`${reverseIp(GOOD_IP)}.wl.example.test A`]: ['127.0.0.2'] });
		const good = await checkReputation(GOOD_IP, resolver, lists, 'mail.gut.example.test');
		expect(good.status).toBe('ok');
		expect(good.raw).toMatchObject({ helo: 'mail.gut.example.test', heloMatches: true, lists: [{ list: 'Test-Sperrliste', listed: false }], allowLists: [{ list: 'Test-Positivliste', listed: true }] });
		const odd = await checkReputation(GOOD_IP, resolver, lists, 'localhost');
		expect(odd.raw).toMatchObject({ helo: 'localhost', heloMatches: false });
		expect(odd.deductions).toEqual([]);
	});
});

describe('list names shown on the site', () => {
	it('match the lists the engine really queries', async () => {
		const { BLOCKLISTS } = await import('../src/checks/reputation.ts');
		const { IP_BLOCKLIST_NAMES, ALLOW_LIST_NAMES } = await import('@emc/shared');
		expect(BLOCKLISTS.filter((l) => !l.allow).map((l) => l.name)).toEqual([...IP_BLOCKLIST_NAMES]);
		expect(BLOCKLISTS.filter((l) => l.allow).map((l) => l.name)).toEqual([...ALLOW_LIST_NAMES]);
	});
});
