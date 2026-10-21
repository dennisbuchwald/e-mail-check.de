// The seven test cases of the result scene, as real results from the engine (fake DNS, fake rspamd).
// Run: node apps/engine/scripts/scene-fixtures.ts <out-dir>
import { mkdirSync, writeFileSync } from 'node:fs';
import { analyzeMessage, type AnalyzeDeps } from '../src/analyze.ts';
import type { SmtpEnvelope } from '../src/checks/auth.ts';
import { fakeResolver, fixture, GOOD_IP, LISTED_IP } from '../test/helpers.ts';

const out = process.argv[2] ?? 'scene-fixtures';
mkdirSync(out, { recursive: true });
const at = new Date('2026-10-21T08:00:13Z');
const clean = async () => ({ score: 0.2, symbols: [{ name: 'MIME_GOOD', score: -0.1 }] });
const spam = async () => ({ score: 15, symbols: [{ name: 'GTUBE', score: 15 }, { name: 'SUBJ_ALL_CAPS', score: 2.1 }] });
const tls = { version: 'TLSv1.3' };
type Case = [name: string, file: string, env: SmtpEnvelope, scan: AnalyzeDeps['scanContent'], dns?: Record<string, unknown>];
// The fake domains sit at IONOS (name servers and MX), so the steps link to the IONOS guides.
const ionos = { 'gut.example.test NS': ['ns1093.ui-dns.de', 'ns1080.ui-dns.com'], 'gut.example.test MX': [{ exchange: 'mx00.ionos.de', priority: 10 }] };
const google = (ip: string) => {
	const rev = ip.split('.').reverse().join('.');
	return { ...ionos, 'gut.example.test TXT': [['v=spf1 ip4:209.85.160.0/24 -all']], [`${rev}.in-addr.arpa PTR`]: ['mail-qt1-f169.google.com'], 'mail-qt1-f169.google.com A': [ip], [`${rev}.bl.0spam.org A`]: ['127.0.0.2'], [`${rev}.dnsbl.dronebl.org A`]: ['127.0.0.3'] };
};
const gut = (over: Partial<SmtpEnvelope> = {}): SmtpEnvelope => ({ ip: GOOD_IP, helo: 'mail.gut.example.test', sender: 'max@gut.example.test', tls, ...over });
const cases: Case[] = [
	['1-alles-gruen', 'gut.eml', gut(), clean, ionos],
	['1b-freemail', 'freemail.eml', gut({ sender: 'max.muster@icloud.com' }), clean],
	['2-dkim-fehlt', 'ohne-dkim.eml', gut({ sender: 'max@ohne-dkim.example.test' }), clean, { '_dmarc.ohne-dkim.example.test TXT': [['v=DMARC1; p=reject']] }],
	['3-dmarc-p-none', 'gut.eml', gut(), clean, { ...ionos, '_dmarc.gut.example.test TXT': [['v=DMARC1; p=none']] }],
	['4-sperrliste', 'sperrliste.eml', gut({ ip: LISTED_IP }), clean, ionos],
	['4b-google-kleine-liste', 'gut.eml', gut({ ip: '209.85.160.169', helo: 'mail-qt1-f169.google.com' }), clean, google('209.85.160.169')],
	['5-kein-tls', 'gut.eml', gut({ tls: null }), clean, ionos],
	['6-spam', 'spam.eml', gut(), spam, ionos],
	['7-dmarc-fail', 'dkim-kaputt.eml', gut({ ip: '198.51.100.77', sender: 'max@dkim-kaputt.example.test', helo: 'x.example.test' }), clean],
];
for (const [name, file, env, scan, dns] of cases) {
	const r = await analyzeMessage(fixture(file), env, 'k7m2x9qa@test.e-mail-check.de', { resolver: fakeResolver(dns), mta: 'mx.e-mail-check.de', resultTtlDays: 7, scanContent: scan, now: () => at }, () => {});
	writeFileSync(`${out}/${name}.json`, JSON.stringify(r));
	console.log(name.padEnd(16), String(r.score).padStart(4), r.findings.map((f) => `${f.id}:${f.status}`).join(' '));
}
