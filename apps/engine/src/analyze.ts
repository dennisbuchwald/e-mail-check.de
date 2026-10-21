// Runs all checks on one message and reports each finished step.
// The message buffer is only held for the duration of this call.
import { randomBytes } from 'node:crypto';
import { bandFor, computeScore, enrichFindings, hasAuthFailure, stationsOf, subScores, summarize, trafficLight, verdictFor, type Finding, type MailMeta, type MailResult, type StepId, type StepInfo } from '@emc/shared';
import { checkAuth, type SmtpEnvelope } from './checks/auth.ts';
import { checkReputation } from './checks/reputation.ts';
import { contentFinding, scanWithRspamd, type BodyStats, type ContentAnalysis } from './checks/content.ts';
import { simpleParser, type ParsedMail } from 'mailparser';
import { extractLinks, summarizeLinks } from './checks/links.ts';
import { senderFinding } from './checks/sender.ts';
import { transportFinding } from './checks/transport.ts';
import { analyzeUnsubscribe } from './checks/unsubscribe.ts';
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

export async function analyzeMessage(message: Buffer, env: SmtpEnvelope, rcpt: string, deps: AnalyzeDeps, onStep: (step: StepId, info?: StepInfo) => void): Promise<MailResult> {
	const now = deps.now?.() ?? new Date();

	// Reputation and content do not depend on the auth results: start them right away.
	const reputation = checkReputation(env.ip, deps.resolver, undefined, env.helo);
	const parsed = await simpleParser(message, { skipImageLinks: true, skipTextToHtml: true, skipTextLinks: true }).catch(() => null);
	const meta = mailMeta(parsed, env, now);
	onStep('received', { mail: { from: meta.from, subject: meta.subject }, detail: meta.tls.used ? `Verschlüsselt empfangen (${meta.tls.version ?? 'TLS'})` : 'Unverschlüsselt empfangen' });
	const content = runContentChecks(message, parsed, env, rcpt, deps);

	const auth = await checkAuth(message, env, deps.resolver, deps.mta);
	onStep('spf', stepInfo(auth.spf));
	onStep('dkim', stepInfo(auth.dkim));
	onStep('dmarc', stepInfo(auth.dmarc));
	const rep = await reputation.catch((err: Error): Finding => ({
		id: 'reputation',
		status: 'skip',
		title: 'Server-Ruf nicht geprüft',
		tech: 'Sperrlisten & rDNS',
		text: 'Die Sperrlisten waren gerade nicht erreichbar.',
		deductions: [],
		raw: { error: err.message },
	}));
	onStep('reputation', stepInfo(rep));
	const cont = await content;
	onStep('content', stepInfo(cont));

	const sender = senderFinding(auth.fromDomain);
	const received = parsed ? parsed.headerLines.filter((h) => h.key.toLowerCase() === 'received').map((h) => h.line.slice(h.line.indexOf(':') + 1).replace(/\s+/g, ' ').trim()) : [];
	const transport = transportFinding(env.tls, received, deps.mta, now);
	const findings = enrichFindings([auth.spf, sender, auth.dkim, auth.dmarc, rep, transport, cont]);
	const score = computeScore(findings);
	const { sub } = summarize(score, findings);
	const verdict = verdictFor(score, stationsOf(findings));
	const headline = `${verdict.line1} ${verdict.line2}`;
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
		verdict,
		sub,
		mail: meta,
		fromDomain: auth.fromDomain,
		findings,
	};
}

/** Interim status plus one short line with real values for the live checklist. */
export function stepInfo(f: Finding): StepInfo {
	const raw = (f.raw ?? {}) as Record<string, any>;
	const fmt = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 1 });
	let detail = f.title;
	if (f.status !== 'skip') {
		if (f.id === 'spf' && raw.domain) {
			if (raw.result === 'pass') detail = `${raw.domain} erlaubt ${raw.clientIp ?? 'diesen Server'}`;
			else if (raw.result === 'none') detail = `Kein SPF-Eintrag für ${raw.domain}`;
			else if (raw.result === 'fail' || raw.result === 'softfail') detail = `${raw.domain} erlaubt ${raw.clientIp ?? 'diesen Server'} nicht`;
		} else if (f.id === 'dkim') {
			const sigs = (raw.signatures ?? []) as { domain?: string; bits?: number | null; result?: string }[];
			const good = sigs.find((x) => x.result === 'pass');
			if (good) detail = `Unterschrift von ${good.domain}${good.bits ? ` · ${good.bits} Bit` : ''}`;
			else if (sigs.length === 0) detail = 'Keine Unterschrift gefunden';
		} else if (f.id === 'dmarc' && raw.policy) {
			detail = raw.result === 'pass' ? `Regel p=${raw.policy} erfüllt` : `Regel p=${raw.policy} nicht erfüllt`;
		} else if (f.id === 'reputation' && Array.isArray(raw.lists)) {
			const asked = raw.lists.filter((l: { listed: boolean | null }) => l.listed !== null);
			const hits = asked.filter((l: { listed: boolean | null }) => l.listed);
			detail = hits.length ? `Auf ${hits.length} von ${asked.length} Sperrlisten: ${hits.map((l: { list: string; pbl?: boolean }) => (l.pbl ? 'Spamhaus PBL (Internetanschluss)' : l.list)).join(', ')}` : `${asked.length} Sperrlisten abgefragt, alle sauber`;
		} else if (f.id === 'content' && typeof raw.rspamdScore === 'number') {
			const links = raw.links?.total ? ` · ${raw.links.total} ${raw.links.total === 1 ? 'Link' : 'Links'} gelesen` : '';
			detail = `Spam-Score ${fmt(raw.rspamdScore)}${links}`;
		}
	}
	return { status: f.status, detail };
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

/** Words, images and parts of the mail: counts only, the text itself is not kept. */
export function bodyStats(parsed: ParsedMail | null, message: Buffer): BodyStats | null {
	if (!parsed) return null;
	const html = typeof parsed.html === 'string' ? parsed.html : '';
	const hasText = !html || /content-type:\s*text\/plain/i.test(message.toString('latin1'));
	// With a real text part count that; otherwise the HTML without tags (mailparser's own text would add link and image markers).
	const readable = hasText ? (parsed.text ?? '') : html.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');
	return {
		words: (readable.match(/[\p{L}\p{N}]{2,}/gu) ?? []).length,
		images: (html.match(/<img\b/gi) ?? []).length,
		hasHtml: html.length > 0,
		// mailparser fills `text` from the HTML when there is no text part, so the MIME structure decides.
		hasText,
		htmlChars: html.length,
	};
}

/** Spam filter and textual checks (links, newsletter headers, text vs. images). Links are never requested. */
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
	const summary = summarizeLinks(links);
	const body = bodyStats(parsed, message);
	const { a, error } = await spam;
	const unsubscribe = analyzeUnsubscribe(headerLines, summary.hasUnsubscribeLink, { links: summary.total, html: !!body?.hasHtml });
	return contentFinding(a, { error, links: summary, unsubscribe, body });
}
