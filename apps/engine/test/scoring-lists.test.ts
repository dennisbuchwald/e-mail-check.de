// Blocklist weighting and time on the way (cases from two real results of 21.10.2026: Google servers on 0spam/DroneBL).
import { describe, expect, it } from 'vitest';
import { fmtDuration } from '@emc/shared';
import { checkReputation } from '../src/checks/reputation.ts';
import { bigSenderOf } from '../src/checks/senders.ts';
import { parseHops } from '../src/checks/transport.ts';
import { fakeResolver } from './helpers.ts';

/** A server with forward-confirmed rDNS, listed on the given zones. */
function server(ip: string, host: string, zones: string[]) {
	const rev = ip.split('.').reverse().join('.');
	const extra: Record<string, unknown> = { [`${rev}.in-addr.arpa PTR`]: [host], [`${host} A`]: [ip] };
	for (const z of zones) extra[`${rev}.${z} A`] = ['127.0.0.2'];
	return fakeResolver(extra);
}

describe('blocklists: major lists decide, small ones are a hint, big senders are not the tester\'s', () => {
	it('Google server on 0spam and DroneBL: no problem, no points (real result QqBX…)', async () => {
		const f = await checkReputation('209.85.160.169', server('209.85.160.169', 'mail-qt1-f169.google.com', ['bl.0spam.org', 'dnsbl.dronebl.org']), undefined, 'mail-qt1-f169.google.com');
		expect(f.status).toBe('ok');
		expect(f.deductions).toEqual([]);
		expect(f.title).toBe('Server von Google');
		expect(f.text).toContain('Liegt nicht in deiner Hand');
	});

	it('Google server on 0spam alone (real result FG1Y…): no points either', async () => {
		const f = await checkReputation('209.85.160.173', server('209.85.160.173', 'mail-qt1-f173.google.com', ['bl.0spam.org']), undefined, 'mail-qt1-f173.google.com');
		expect([f.status, f.deductions.length]).toEqual(['ok', 0]);
	});

	it('own server on a small list: a hint with at most 0.3 points', async () => {
		const one = await checkReputation('203.0.113.80', server('203.0.113.80', 'mail.eigener-server.example.test', ['bl.0spam.org']));
		expect(one.status).toBe('warn');
		expect(one.deductions).toEqual([{ reason: 'Auf kleiner Sperrliste: 0spam', points: 0.2 }]);
		const three = await checkReputation('203.0.113.81', server('203.0.113.81', 'mail.eigener-server.example.test', ['bl.0spam.org', 'dnsbl.dronebl.org', 'all.s5h.net']));
		expect(three.deductions[0].points).toBe(0.3);
	});

	it('own server on a major list: a problem with points', async () => {
		const f = await checkReputation('203.0.113.82', server('203.0.113.82', 'mail.eigener-server.example.test', ['bl.spamcop.net']));
		expect(f.status).toBe('bad');
		expect(f.deductions[0]).toEqual({ reason: 'Auf Sperrliste: SpamCop', points: 3 });
	});

	it('only a verified name counts as a big sender', async () => {
		expect(bigSenderOf('mail-qt1-f169.google.com')).toBe('Google');
		expect(bigSenderOf('eu-smtp-1.mimecast.example')).toBeNull();
		// PTR says google.com but does not point back: no free pass.
		const rev = '203.0.113.83'.split('.').reverse().join('.');
		const fake = fakeResolver({ [`${rev}.in-addr.arpa PTR`]: ['mail-x.google.com'], [`${rev}.bl.0spam.org A`]: ['127.0.0.2'] });
		const f = await checkReputation('203.0.113.83', fake);
		expect(f.status).toBe('warn');
		expect(f.deductions.some((d) => d.reason.includes('kleiner Sperrliste'))).toBe(true);
	});
});

describe('time on the way', () => {
	const at = new Date('2026-10-21T08:00:03Z');
	it('reads the zone offsets of the Received dates', () => {
		const { durationSec } = parseHops(['from x by mail.sender.example.test with ESMTPS; Wed, 21 Oct 2026 10:00:00 +0200'], 'mx.test', at);
		expect(durationSec).toBe(3);
	});
	it('drops clearly wrong values and shows "< 1 s" below a second', () => {
		expect(parseHops(['by a.example.test; Wed, 21 Oct 2026 12:00:00 +0200'], 'mx.test', at).durationSec).toBeNull();
		expect(parseHops(['by a.example.test; Tue, 20 Oct 2026 10:00:00 +0200'], 'mx.test', at).durationSec).toBeNull();
		expect(fmtDuration(0)).toBe('< 1 s');
		expect(fmtDuration(4)).toBe('4 s');
		expect(fmtDuration(86405)).toBeNull();
		expect(fmtDuration(null)).toBeNull();
	});
});
