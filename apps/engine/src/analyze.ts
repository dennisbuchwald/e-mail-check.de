// Runs all checks on one message and reports each finished step.
// The message buffer is only held for the duration of this call.
import { randomBytes } from 'node:crypto';
import { computeScore, sortFindings, summarize, trafficLight, type Finding, type MailResult, type StepId } from '@emc/shared';
import { checkAuth, type SmtpEnvelope } from './checks/auth.ts';
import { checkReputation } from './checks/reputation.ts';
import { contentFinding, scanWithRspamd, type ContentAnalysis } from './checks/content.ts';
import type { DnsResolver } from './dns.ts';

export interface AnalyzeDeps {
	resolver: DnsResolver;
	mta: string;
	resultTtlDays: number;
	/** Content scanner; null skips the content check. */
	scanContent: ((message: Buffer, env: SmtpEnvelope, rcpt: string) => Promise<ContentAnalysis>) | null;
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
	const content = deps.scanContent
		? deps.scanContent(message, env, rcpt).then((a) => contentFinding(a), (err: Error) => contentFinding(null, err.message))
		: Promise.resolve(contentFinding(null, 'disabled'));

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

	const findings = sortFindings([auth.spf, auth.dkim, auth.dmarc, rep, cont]);
	const score = computeScore(findings);
	const { headline, sub } = summarize(score, findings);
	return {
		id: newId(),
		createdAt: now.toISOString(),
		expiresAt: new Date(now.getTime() + deps.resultTtlDays * 86400_000).toISOString(),
		score,
		light: trafficLight(score, findings),
		headline,
		sub,
		fromDomain: auth.fromDomain,
		findings,
	};
}
