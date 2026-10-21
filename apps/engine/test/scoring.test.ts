import { describe, expect, it } from 'vitest';
import { bandFor, enrichFindings, hasAuthFailure, subScores, trafficLight, verdictFor, type Finding } from '@emc/shared';
import { analyzeMessage } from '../src/analyze.ts';
import { fakeResolver, fixture, GOOD_IP } from './helpers.ts';

const f = (id: Finding['id'], status: Finding['status'], points = 0): Finding => ({
	id,
	status,
	title: id,
	tech: id,
	text: '',
	deductions: points ? [{ reason: 'x', points }] : [],
	raw: {},
});

describe('bands', () => {
	it.each([
		[0, 'risk'],
		[4.9, 'risk'],
		[5, 'endangered'],
		[6.9, 'endangered'],
		[7, 'solid'],
		[8.9, 'solid'],
		[9, 'good'],
		[10, 'good'],
	])('%s → %s', (score, band) => expect(bandFor(score)).toBe(band));
});

describe('exception rule', () => {
	it('warns on a failing SPF/DKIM/DMARC even with a high score', () => {
		const fs = [f('spf', 'ok'), f('dkim', 'ok'), f('dmarc', 'bad', 1.5), f('reputation', 'ok'), f('content', 'ok')];
		expect(hasAuthFailure(fs)).toBe(true);
		expect(trafficLight(8.5, fs)).toBe('bad');
	});
	it('does not trigger for reputation or content problems', () => {
		expect(hasAuthFailure([f('reputation', 'bad', 3), f('content', 'bad', 2)])).toBe(false);
	});
});

describe('sub scores', () => {
	it('turns deductions per area into percent', () => {
		const s = subScores([f('spf', 'ok'), f('sender', 'warn', 0.2), f('dkim', 'bad', 2), f('dmarc', 'warn', 0.2), f('reputation', 'ok'), f('transport', 'ok'), f('content', 'warn', 0.6)]);
		expect(s).toEqual({ auth: Math.round(100 * (1 - 2.4 / 7.2)), reputation: 100, content: Math.round(100 * (1 - 0.6 / 5.3)) });
	});
	it('hides an area that could not be checked', () => {
		expect(subScores([f('spf', 'ok'), f('reputation', 'skip'), f('content', 'skip')]).reputation).toBeNull();
	});
});

describe('gain and impact', () => {
	it('sorts problems by biggest effect first', () => {
		const out = enrichFindings([f('content', 'warn', 0.5), f('dmarc', 'bad', 1.5), f('dkim', 'bad', 2), f('spf', 'ok')]);
		expect(out.map((x) => [x.id, x.gain, x.impact])).toEqual([
			['dkim', 2, 'hoch'],
			['dmarc', 1.5, 'hoch'],
			['content', 0.5, 'mittel'],
			['spf', 0, 'gering'],
		]);
	});
});

describe('verdict (two lines, by station status)', () => {
	const st = (...statuses: string[]) => statuses.map((status) => ({ status })) as { status: 'ok' | 'warn' | 'bad' | 'skip' }[];
	it.each([
		[10, st('ok', 'ok', 'ok', 'ok', 'ok', 'ok'), 'Deine Mail kam sauber an.', 'Jede Station grün.'],
		[9.8, st('warn', 'ok', 'ok', 'ok', 'ok', 'ok'), 'Deine Mail kam sauber an.', 'Ein Tipp für die letzte Stufe.'],
		[9.4, st('warn', 'ok', 'warn', 'ok', 'ok', 'ok'), 'Deine Mail kam sauber an.', 'Zwei Tipps für die letzte Stufe.'],
		[7.5, st('ok', 'bad', 'bad', 'ok', 'ok', 'warn'), 'Deine Mail kommt an, aber nicht überall.', '2 Dinge solltest du beheben.'],
		[8.5, st('ok', 'ok', 'bad', 'ok', 'ok', 'ok'), 'Deine Mail kommt an, aber nicht überall.', 'Eine Sache solltest du beheben.'],
		[3, st('bad', 'bad', 'bad', 'bad', 'ok', 'ok'), 'Hier landet viel im Spam.', 'So behebst du es.'],
	])('%s', (score, stations, line1, line2) => expect(verdictFor(score as number, stations)).toEqual({ line1, line2 }));
	it('says spam when the spam filter does, even at 6 points', () => {
		const content = { id: 'content', status: 'bad', raw: { rspamdScore: 15 } } as unknown as Finding;
		expect(verdictFor(6, [{ status: 'ok' }, { status: 'bad', findings: [content] }])).toEqual({ line1: 'Deine Mail landet im Spam.', line2: 'Der Inhalt ist das Problem.' });
	});
});

describe('mail meta', () => {
	it('stores sender, a short subject and TLS, never the body', async () => {
		const r = await analyzeMessage(fixture('gut.eml'), { ip: GOOD_IP, helo: 'x', sender: 'max@gut.example.test', tls: { version: 'TLSv1.3' } }, 'k@test.e-mail-check.de', { resolver: fakeResolver(), mta: 'mx', resultTtlDays: 7, scanContent: null }, () => {});
		expect(r.mail.from).toBe('max@gut.example.test');
		expect(r.mail.subject).toBe('Angebot Website');
		expect(r.mail.tls).toEqual({ used: true, version: 'TLSv1.3' });
		expect(JSON.stringify(r)).not.toContain('Angebot für die neue Website');
		expect(r.subScores.auth).toBe(100);
	});
});
