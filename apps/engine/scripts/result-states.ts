// Builds four example results (all green, freemail hint, SPF missing, spam) from the test fixtures, for screenshots.
// Run: node apps/engine/scripts/result-states.ts <out-dir>
import { mkdirSync, writeFileSync } from 'node:fs';
import { analyzeMessage, type AnalyzeDeps } from '../src/analyze.ts';
import { fakeResolver, fixture, GOOD_IP } from '../test/helpers.ts';

const out = process.argv[2] ?? 'result-states';
mkdirSync(out, { recursive: true });
const at = new Date('2026-10-20T08:00:13Z');
const clean = async () => ({ score: 0.2, symbols: [{ name: 'MIME_GOOD', score: -0.1 }, { name: 'FROM_HAS_DN', score: 0 }, { name: 'RCPT_COUNT_ONE', score: 0 }, { name: 'SUBJ_ALL_CAPS', score: 0.3 }] });
const spam = async () => ({ score: 15, symbols: [{ name: 'GTUBE', score: 15 }, { name: 'SUBJ_ALL_CAPS', score: 2.1 }, { name: 'SUBJECT_ENDS_EXCLAIM', score: 1.2 }, { name: 'MIME_GOOD', score: -0.1 }] });
const states: [string, string, string, AnalyzeDeps['scanContent']][] = [
	['alles-gruen', 'gut.eml', 'max@gut.example.test', clean],
	['freemail', 'freemail.eml', 'max.muster@icloud.com', clean],
	['spf-fehlt', 'ohne-spf.eml', 'max@ohne-spf.example.test', clean],
	['spam', 'spam.eml', 'max@gut.example.test', spam],
];
for (const [name, file, sender, scan] of states) {
	const r = await analyzeMessage(fixture(file), { ip: GOOD_IP, helo: 'mail.gut.example.test', sender, tls: { version: 'TLSv1.3' } }, 'k7m2x9qa@test.e-mail-check.de', { resolver: fakeResolver(), mta: 'mx.e-mail-check.de', resultTtlDays: 7, scanContent: scan, now: () => at }, () => {});
	writeFileSync(`${out}/${name}.json`, JSON.stringify(r));
	console.log(name, r.score, r.verdict?.line2);
}
