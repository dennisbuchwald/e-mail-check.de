// Runs all checks on one message and reports each finished step.
// The message buffer is only held for the duration of this call.
import { randomBytes } from 'node:crypto';
import { bandFor, computeScore, enrichFindings, hasAuthFailure, subScores, summarize, trafficLight, type Finding, type MailMeta, type MailResult, type StepId } from '@emc/shared';
import { checkAuth, type SmtpEnvelope } from './checks/auth.ts';
import { checkReputation } from './checks/reputation.ts';
import { contentFinding, scanWithRspamd, type ContentAnalysis } from './checks/content.ts';
import { simpleParser, type ParsedMail } from 'mailparser';
import { checkLinks, extractLinks, type LinkReport } from './checks/links.ts';
import { analyzeUnsubscribe } from './checks/unsubscribe.ts';
import type { DnsResolver } from './dns.ts';

export interface AnalyzeDeps {
	resolver: DnsResolver;
	mta: string;
	resultTtlDays: number;
	/** Content scanner; null skips the content check. */
	scanContent: ((message: Buffer, env: SmtpEnvelope, rcpt: string) => Promise<ContentAnalysis>) | null;
	/** Link probe override for tests; false disables the link check. Default: real, SSRF-guarded requests. */
	linkProbe?: ((url: string) => Promise<{ status: number } | { error: 'nxdomain' | 'refused' | 'blocked' | 'timeout' | 'other' }>) | false;
	now?: () => Date;
}

export function rspamdScanner(url: string): AnalyzeDeps['scanContent'] {
	return (message, env, rcpt) => scanWithRspamd(url, message, env, rcpt);
}

/** Unguessable id for share links (128 bit, URL-safe). */
export function newId(bytes = 16): string {
	return randomBytes(bytes).toString('base64url');
}

export async function analyzeMessage(message: Buffer, env: SmtpEnvelope, rcpt: string, deps: AnalyzeDeps, onStep: (step: StepId) => void): Promise<MailResult> {
	const now = deps.now?.() ?? new Date();
	onStep('received');

	// Reputation and content do not depend on the auth results: start them right away.
	const reputation = checkReputation(env.ip, deps.resolver);
	const parsed = await simpleParser(message, { skipImageLinks: true, skipTextToHtml: true, skipTextLinks: true }).catch(() => null);
	const content = runContentChecks(message, parsed, env, rcpt, deps);

	const auth = await checkAuth(message, env, deps.resolver, deps.mta);
	onStep('spf');
	onStep('dkim');
	onStep('dmarc');
	const rep = await reputation.catch((err: Error): Finding => ({
		id: 'reputation',
		status: 'skip',
		title: 'Server-Ruf nicht geprüft',
		tech: 'Sperrlisten & rDNS',
		text: 'Die Sperrlisten waren gerade nicht erreichbar.',
		deductions: [],
		raw: { error: err.message },
	}));
	onStep('reputation');
	const cont = await content;
	onStep('content');

	const findings = enrichFindings([auth.spf, auth.dkim, auth.dmarc, rep, cont]);
	const score = computeScore(findings);
	const { headline, sub } = summarize(score, findings);
	return {
		id: newId(),
		createdAt: now.toISOString(),
		expiresAt: new Date(now.getTime() + deps.resultTtlDays * 86400_000).toISOString(),
		score,
		light: trafficLight(score, findings),
		band: bandFor(score),
		authWarning: hasAuthFailure(findings),
		subScores: subScores(findings),
		headline,
		sub,
		mail: mailMeta(parsed, env, now),
		fromDomain: auth.fromDomain,
		findings,
	};
}

/** Sender address, subject (cut to 80 chars) and transport facts for the result header. */
function mailMeta(parsed: ParsedMail | null, env: SmtpEnvelope, now: Date): MailMeta {
	const subject = parsed?.subject?.replace(/\s+/g, ' ').trim() ?? null;
	return {
		from: parsed?.from?.value?.[0]?.address?.toLowerCase() ?? (env.sender || null),
		subject: subject ? (subject.length > 80 ? `${subject.slice(0, 79)}…` : subject) : null,
		receivedAt: now.toISOString(),
		tls: { used: !!env.tls, version: env.tls?.version ?? null },
	};
}

/** Spam filter, link check and newsletter headers run in parallel; the parsed mail only lives in this call. */
async function runContentChecks(message: Buffer, parsed: ParsedMail | null, env: SmtpEnvelope, rcpt: string, deps: AnalyzeDeps): Promise<Finding> {
	const spam = deps.scanContent
		? deps.scanContent(message, env, rcpt).then((a) => ({ a, error: undefined }), (err: Error) => ({ a: null, error: err.message }))
		: Promise.resolve({ a: null, error: 'disabled' });
	let headerLines: [string, string][] = [];
	let links: string[] = [];
	if (parsed) {
		headerLines = parsed.headerLines.map((h) => [h.key.toLowerCase(), h.line.slice(h.line.indexOf(':') + 1).trim()]);
		links = extractLinks(typeof parsed.html === 'string' ? parsed.html : undefined, parsed.text);
	}
	const linkReport: Promise<LinkReport | null> =
		deps.linkProbe === false
			? Promise.resolve(null)
			: checkLinks(links, { resolve: deps.resolver, probe: deps.linkProbe }).catch(() => null);
	const [{ a, error }, report] = await Promise.all([spam, linkReport]);
	const unsubscribe = analyzeUnsubscribe(headerLines, report?.hasUnsubscribeLink ?? links.some((u) => /unsubscribe|abmeld/i.test(u)));
	return contentFinding(a, { error, links: report, unsubscribe });
}
