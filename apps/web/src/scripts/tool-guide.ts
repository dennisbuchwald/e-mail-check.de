// Provider guide in the result ("Anleitung für deinen Anbieter"): steps per provider and topic, DNS values to copy.
import type { GuideTopic, MailResult } from '@emc/shared';
import { copyRow, inline, esc } from './util';

interface GuideStep {
	text: string;
	eintrag?: { typ: string; host: string; wert: string };
}
interface GuideData {
	[provider: string]: { name: string; url: Partial<Record<GuideTopic, string>>; schritte: Partial<Record<GuideTopic, GuideStep[]>> };
}

const TOPIC_TITLES: Record<GuideTopic, { title: string; lead: string }> = {
	spf: { title: 'Absender bestätigen', lead: 'Dauert etwa 5 Minuten. Fachbegriff: SPF-Eintrag.' },
	dkim: { title: 'Unterschrift einrichten', lead: 'Dauert etwa 10 Minuten. Fachbegriff: DKIM.' },
	dmarc: { title: 'Schutzregel einrichten', lead: 'Dauert etwa 3 Minuten. Fachbegriff: DMARC-Eintrag.' },
};

/** Generic steps for providers we have no guide for yet. */
const GENERIC: Record<GuideTopic, GuideStep[]> = {
	spf: [
		{ text: 'Melde dich bei dem Anbieter an, bei dem deine **Domain** liegt, und öffne die **DNS-Einstellungen**.' },
		{ text: 'Suche einen **TXT-Eintrag**, der mit `v=spf1` beginnt. Es darf nur einen davon geben.' },
		{ text: 'Trag dort alle Dienste ein, die Mails für dich senden. Den passenden Baustein (`include:…`) nennt dir jeder Dienst in seiner Hilfe.' },
		{ text: 'Speichern, ein paar Minuten warten und erneut testen.' },
	],
	dkim: [
		{ text: 'Öffne bei dem Dienst, der deine Mails **verschickt** (Postfach-Anbieter oder Newsletter-Tool), die Einstellungen zu **DKIM** oder **Domain-Authentifizierung**.' },
		{ text: 'Der Dienst zeigt dir einen oder zwei Einträge (TXT oder CNAME). Kopier Name und Wert.' },
		{ text: 'Leg diese Einträge in den **DNS-Einstellungen** deiner Domain an.' },
		{ text: 'Aktiviere DKIM danach beim Versand-Dienst und teste erneut.' },
	],
	dmarc: [
		{ text: 'Öffne die **DNS-Einstellungen** deiner Domain.' },
		{ text: 'Leg einen neuen **TXT-Eintrag** an. Als Name (Host) trägst du `_dmarc` ein.', eintrag: { typ: 'TXT', host: '_dmarc', wert: 'v=DMARC1; p=none; rua=mailto:dmarc@{domain}' } },
		{ text: 'Speichern. Nach ein paar Wochen ohne Probleme stellst du `p=none` auf `p=quarantine` um.' },
	],
};

/** Guess the provider from the SPF record, to preselect the right guide. */
function guessProvider(result: MailResult): string | null {
	const spf = result.findings.find((f) => f.id === 'spf');
	const rec = String(spf?.raw?.record ?? '').toLowerCase();
	if (rec.includes('spf.protection.outlook.com')) return 'microsoft-365';
	if (rec.includes('_spf.google.com')) return 'google-workspace';
	if (rec.includes('ionos') || rec.includes('kundenserver.de')) return 'ionos';
	if (rec.includes('strato')) return 'strato';
	if (rec.includes('kasserver.com') || rec.includes('all-inkl')) return 'all-inkl';
	if (rec.includes('your-server.de') || rec.includes('hetzner')) return 'hetzner';
	return null;
}

export interface GuideContext {
	$: <T extends Element = HTMLElement>(sel: string) => T;
	$$: (sel: string) => HTMLElement[];
	show: (screen: 'guide') => void;
	result: () => MailResult | null;
	reduced: boolean;
}

export function createGuide(ctx: GuideContext) {
	let guideTopic: GuideTopic = 'dmarc';
	let guides: GuideData | null = null;
	const reduced = ctx.reduced;

	async function open(topic: GuideTopic) {
		guideTopic = topic;
		ctx.$('[data-guide-title]').textContent = TOPIC_TITLES[topic].title;
		ctx.$('[data-guide-lead]').textContent = TOPIC_TITLES[topic].lead;
		ctx.$('#provider-label').textContent = topic === 'dkim' ? 'Wer verschickt deine Mails?' : 'Wo liegt deine Domain?';
		ctx.show('guide');
		ctx.$('[data-guide-title]').focus({ preventScroll: true });
		window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
		if (!guides) guides = await fetch('/anleitungen.json').then((r) => r.json() as Promise<GuideData>).catch(() => ({}));
		let provider: string | null = null;
		try {
			provider = localStorage.getItem('emc-provider');
		} catch {
			/* no storage */
		}
		provider = (ctx.result() && guessProvider(ctx.result()!)) ?? provider ?? 'ionos';
		pick(provider);
	}

	function pick(provider: string) {
		for (const chip of ctx.$$('[data-provider]')) chip.setAttribute('aria-pressed', String(chip.dataset.provider === provider));
		try {
			localStorage.setItem('emc-provider', provider);
		} catch {
			/* no storage */
		}
		const g = guides?.[provider];
		const steps = g?.schritte[guideTopic] ?? GENERIC[guideTopic];
		const domain = ctx.result()?.fromDomain ?? 'deine-domain.de';
		ctx.$('[data-guide-steps]').innerHTML = steps
			.map((s, i) => {
				const fill = (v: string) => v.replaceAll('{domain}', domain);
				const box = s.eintrag
					? `<div class="copybox"><p class="copybox-host">Typ <code>${esc(s.eintrag.typ)}</code> · Name/Host <code>${esc(fill(s.eintrag.host))}</code></p>${copyRow(fill(s.eintrag.wert))}</div>`
					: '';
				return `<li class="gstep"><span class="gnum" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><div class="gtext"><p>${inline(s.text)}</p>${box}</div></li>`;
			})
			.join('');
		const link = ctx.$<HTMLAnchorElement>('[data-guide-link]');
		link.href = g?.url[guideTopic] ?? `/wissen/${guideTopic}`;
		link.textContent = g ? `Ausführliche Anleitung für ${g.name}` : 'Ausführlich erklärt';
	}

	return { open, pick };
}
