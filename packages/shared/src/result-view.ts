// Result page V2 (design/redesign/ergebnis-v2-prototyp.html, tab D) as one HTML renderer.
// Used by the browser after a live test and by the engine for shared links (server-side, via Caddy templates),
// so everything is visible without JavaScript. JS only switches stations and runs the animations.
import { ruleTitle } from './rspamd.ts';
import { BANDS, verdictFor } from './scoring.ts';
import { initialStation, stationsOf, type Station, type StationId } from './stations.ts';
import type { MailResult, Status } from './types.ts';

export interface ResultViewOptions {
	/** Absolute share URL of this result. */
	shareUrl: string;
	/** "Lass es einrichten" target, shown when there is a problem. */
	setupUrl?: string;
}

export function esc(s: unknown): string {
	return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

const fmt1 = (n: number) => n.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmt = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 1 });
type Raw = Record<string, any>;
const rawOf = (st: Station, id: string): Raw => (st.findings.find((f) => f.id === id)?.raw ?? {}) as Raw;

const STATUS_WORD: Record<Status, string> = { ok: 'bestanden', warn: 'Hinweis', bad: 'Problem', skip: 'nicht geprüft' };

const ICONS: Record<StationId, string> = {
	absender: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
	unterschrift: '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>',
	schutzregel: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/>',
	serverruf: '<rect x="4" y="4" width="16" height="6" rx="2"/><rect x="4" y="14" width="16" height="6" rx="2"/><path d="M8 7h.01M8 17h.01"/>',
	transport: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
	posteingang: '<path d="M3 13h5l2 3h4l2-3h5"/><path d="M5 13l2-8h10l2 8v6H5z"/>',
};
const svg = (paths: string, size = 22, sw = 1.8) =>
	`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const BADGE: Record<Status, string> = {
	ok: svg('<path d="M5 12l4 4 10-10"/>', 10, 3.6),
	warn: svg('<path d="M12 7v6M12 17h.01"/>', 10, 3.6),
	bad: svg('<path d="M7 7l10 10M17 7L7 17"/>', 10, 3.6),
	skip: svg('<path d="M6 12h12"/>', 10, 3.6),
};
const COPY = svg('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>', 16, 2);

/** Short mono value under each station. */
function stationValue(st: Station): string {
	switch (st.id) {
		case 'absender': {
			if (rawOf(st, 'sender').freemail) return 'Freemail';
			const r = rawOf(st, 'spf').result;
			return r && r !== 'none' ? `SPF ${r}` : 'SPF fehlt';
		}
		case 'unterschrift': {
			const sig = (rawOf(st, 'dkim').signatures ?? []).find((s: Raw) => s.result === 'pass') ?? rawOf(st, 'dkim').signatures?.[0];
			if (!sig) return 'keine Unterschrift';
			return sig.result === 'pass' ? `DKIM ${sig.bits ? `${sig.bits} Bit` : 'pass'}` : `DKIM ${sig.result}`;
		}
		case 'schutzregel': {
			const p = rawOf(st, 'dmarc').policy;
			const level = { none: 1, quarantine: 2, reject: 3 }[p as string];
			return level ? `DMARC Stufe ${level}` : 'keine Regel';
		}
		case 'serverruf': {
			const lists = (rawOf(st, 'reputation').lists ?? []) as Raw[];
			const asked = lists.filter((l) => l.listed !== null);
			return asked.length ? `${asked.filter((l) => l.listed).length} von ${asked.length} Listen` : 'nicht geprüft';
		}
		case 'transport': {
			const t = rawOf(st, 'transport').tls;
			return t ? (t.used ? `TLS ${t.level ?? ''}`.trim() : 'ohne TLS') : 'nicht geprüft';
		}
		case 'posteingang': {
			const s = rawOf(st, 'content').rspamdScore;
			return typeof s === 'number' ? `Spam-Score ${fmt(s)}` : 'nicht geprüft';
		}
	}
}

/** Plain-language headline per station and status. */
function stationHeading(st: Station): string {
	const main = st.findings.filter((f) => f.status !== 'skip').sort((a, b) => rank(b.status) - rank(a.status))[0];
	return main?.title ?? `${st.title}: nicht geprüft`;
}
const rank = (s: Status) => ({ bad: 3, warn: 2, ok: 1, skip: 0 })[s];

function stationText(st: Station): string {
	const checked = st.findings.filter((f) => f.status !== 'skip');
	if (!checked.length) return st.findings[0]?.text ?? 'Diese Station konnten wir bei diesem Test nicht prüfen.';
	// With a hint or problem, explain only that; the passed part of the station would just add noise.
	const open = checked.filter((f) => f.status !== 'ok');
	const fs = open.length ? open : checked;
	return fs
		.sort((a, b) => rank(b.status) - rank(a.status))
		.map((f) => esc(f.text))
		.join(' ');
}

const rawBox = (lines: string[]) => `<div class="rv-raw mono">${lines.map(esc).join('\n')}</div>`;

/** Measurement graphic per station (tab C/D of the prototype). */
function stationVisual(st: Station, r: MailResult): string {
	switch (st.id) {
		case 'absender': {
			const spf = rawOf(st, 'spf');
			const sender = rawOf(st, 'sender');
			const domain = sender.domain ?? r.fromDomain ?? spf.domain ?? 'unbekannt';
			const tip = sender.freemail
				? `<div class="rv-tip"><span class="dot" style="background:var(--warn)"></span><span><b>Eigene Domain nutzen</b>Zum Beispiel <span class="mono">name@deine-firma.de</span>. Bringt die letzten ${fmt1(0.2)} Punkte.</span></div>`
				: '';
			return `<span class="eyebrow">Absender-Domain</span><div class="h rv-big">${esc(domain)}</div>${tip}${rawBox([
				`Received-SPF: ${spf.result ?? 'none'}${spf.domain ? ` (${spf.domain}` : ''}${spf.clientIp ? `: ${spf.clientIp}` : ''}${spf.domain ? ')' : ''}${spf.helo ? ` helo=${spf.helo}` : ''}`,
				...(spf.record ? [`${spf.domain}  TXT  "${spf.record}"`] : []),
			])}`;
		}
		case 'unterschrift': {
			const sigs = (rawOf(st, 'dkim').signatures ?? []) as Raw[];
			const sig = sigs.find((s) => s.result === 'pass') ?? sigs[0];
			const bits = Number(sig?.bits) || 0;
			const bar = (b: number, label: string) =>
				`<div class="rv-keybar${bits === b ? ' me' : ''}"><span>${b}</span><span class="b"><i style="width:${(b / 4096) * 100}%"></i></span><span>${bits === b ? 'du' : label}</span></div>`;
			return `<span class="eyebrow">Schlüssellänge DKIM</span><div class="h rv-big">${bits ? `${bits} <small>Bit</small>` : sig ? 'unbekannt' : 'keine'}</div><div class="rv-keybars">${bar(1024, 'ok')}${bar(2048, 'empfohlen')}${bar(4096, 'max')}</div>${rawBox(
				sig ? [`dkim=${sig.result}${bits ? ` (${bits}-bit key)` : ''} header.d=${sig.domain ?? '?'} header.s=${sig.selector ?? '?'}${sig.aligned ? ` · passt zu ${sig.aligned}` : ''}`] : ['Keine DKIM-Signatur in der Mail.'],
			)}`;
		}
		case 'schutzregel': {
			const d = rawOf(st, 'dmarc');
			const level = ({ none: 1, quarantine: 2, reject: 3 } as Record<string, number>)[d.policy] ?? 0;
			const steps = [1, 2, 3].map((i) => `<div class="${i <= level ? 'on' : ''}"></div>`).join('');
			const labels = ['none', 'quarantine', 'reject'].map((p, i) => `<span class="${i + 1 === level ? 'cur' : ''}">${p}</span>`).join('');
			const aligned = d.spfAligned || d.dkimAligned;
			return `<span class="eyebrow">Schutzregel DMARC</span><div class="h rv-big">${level ? `Stufe ${level} <small>von 3</small>` : 'keine Regel'}</div><div class="rv-steps">${steps}</div><div class="rv-steps-l">${labels}</div><div class="rv-kv"><span>Passt die Absender-Domain?</span><b>${aligned ? `ja, über ${[d.spfAligned && 'SPF', d.dkimAligned && 'DKIM'].filter(Boolean).join(' und ')}` : 'nein'}</b></div>${rawBox(
				[d.record ? `_dmarc.${r.fromDomain ?? ''}  TXT  "${d.record}"` : `_dmarc.${r.fromDomain ?? ''}: kein Eintrag`, `dmarc=${d.result ?? 'none'}`],
			)}`;
		}
		case 'serverruf': {
			const rep = rawOf(st, 'reputation');
			const lists = (rep.lists ?? []) as Raw[];
			const asked = lists.filter((l) => l.listed !== null);
			const hits = asked.filter((l) => l.listed);
			const allow = ((rep.allowLists ?? []) as Raw[]).filter((l) => l.listed);
			const grid = lists
				.map((l) => `<div><span class="dot ${l.listed ? 'is-bad' : l.listed === null ? 'is-skip' : 'is-ok'}"></span>${esc(l.list)}${l.pbl ? ' (PBL)' : ''}${l.listed === null ? ' <small>keine Antwort</small>' : ''}</div>`)
				.join('');
			const good = allow.length ? `<div class="rv-good"><span class="dot is-ok"></span>Guter Ruf: steht auf ${allow.map((l) => esc(l.list)).join(', ')}</div>` : '';
			return `<span class="eyebrow">Sperrlisten</span><div class="h rv-big">${hits.length} <small>von ${asked.length} Listen</small></div><div class="rv-lists">${grid}</div>${good}${rawBox([
				`IP ${rep.ip ?? '?'} → ${rep.ptr ?? 'kein rDNS-Name'}${rep.ptr ? (rep.ptrMatches ? ' · passt' : ' · passt nicht') : ''}`,
				`HELO ${rep.helo ?? '?'}${rep.helo ? (rep.heloMatches ? ' · passt' : ' · passt nicht zur IP') : ''}`,
			])}`;
		}
		case 'transport': {
			const t = rawOf(st, 'transport');
			const hops = (t.hops ?? []) as { host: string; sec: number }[];
			const line = hops
				.map((h, i) => `${i ? '<div class="ln"></div>' : ''}<div class="p"><i${i === hops.length - 1 ? ' class="us"' : ''}></i><span>${esc(i === hops.length - 1 ? 'wir' : shortHost(h.host))}</span><span class="mono">+${h.sec} s</span></div>`)
				.join('');
			const tls = ['1.0', '1.1', '1.2', '1.3'].map((v) => `<div class="${v === t.tls?.level ? 'me' : v < '1.2' ? 'old' : ''}">${v}</div>`).join('');
			return `<span class="eyebrow">Zustellweg</span><div class="h rv-big">${hops.length} <small>Stationen${t.durationSec !== null && t.durationSec !== undefined ? ` · ${t.durationSec} s unterwegs` : ''}</small></div><div class="rv-chain">${line}</div><span class="eyebrow">Verschlüsselung</span><div class="rv-tls">${tls}</div>${rawBox([
				t.tls?.used ? `${t.tls.version ?? 'TLS'}` : 'Ohne TLS übertragen',
				...hops.map((h) => `by ${h.host} +${h.sec}s`),
			])}`;
		}
		case 'posteingang': {
			const c = rawOf(st, 'content');
			const score = typeof c.rspamdScore === 'number' ? c.rspamdScore : null;
			const pos = score === null ? 0 : Math.max(0, Math.min(100, (score / 15) * 100));
			const rules = ((c.symbols ?? []) as Raw[])
				.slice()
				.sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
				.map((s) => `<div class="r"><span>${esc(ruleTitle(s.name))} <small class="mono">${esc(s.name)}</small></span><span class="pt mono ${s.score > 0 ? 'p' : s.score < 0 ? 'g' : ''}">${s.score > 0 ? '+' : ''}${fmt(s.score)}</span></div>`)
				.join('');
			const own = ((c.checks ?? []) as Raw[])
				.map((x) => `<div class="r"><span>${esc(x.title)}</span><span class="pt mono ${x.points > 0 ? 'p' : ''}">${x.points > 0 ? `−${fmt(x.points)}` : x.status === 'ok' ? 'ok' : x.status === 'info' ? 'Info' : 'Hinweis'}</span></div>`)
				.join('');
			const links = c.links ? `<div class="rv-kv"><span>Links</span><b>${c.links.total} gelesen, ${c.links.domains} Domains gegen URI-Sperrlisten geprüft, nie aufgerufen</b></div>` : '';
			return `<span class="eyebrow">Spam-Score</span><div class="h rv-big">${score === null ? '–' : fmt(score)} <small>Pkt.</small></div><div class="rv-gauge" style="--pos:${pos}%"><span class="mk"></span></div><div class="rv-ticks"><span style="left:0">0</span><span style="left:26.6%">4 Verdacht</span><span style="left:40%">6 Spam</span><span style="right:0">15</span></div>${links}<div class="rv-rules">${own}${rules || '<div class="r"><span>Keine Spamfilter-Regel angeschlagen</span><span></span></div>'}</div>`;
		}
	}
}

function shortHost(h: string): string {
	const parts = h.split('.');
	return parts.length > 2 ? parts.slice(-2).join('.') : h;
}

/** One concrete next step per station, in plain words (the explanation stays in the text above). */
function actionText(st: Station): string {
	const f = st.findings.filter((x) => x.status === 'warn' || x.status === 'bad').sort((a, b) => rank(b.status) - rank(a.status))[0];
	const raw = (f?.raw ?? {}) as Raw;
	switch (f?.id) {
		case 'sender':
			return 'Richte eine Adresse mit deiner eigenen Domain ein (z. B. bei deinem Webhoster) und verschick Kunden- und Firmenmails von dort.';
		case 'spf':
			return raw.result === 'none'
				? 'Leg bei dem Anbieter, bei dem deine Domain liegt, einen SPF-Eintrag an. Darin steht, welche Server Mails für dich verschicken dürfen.'
				: 'Ergänze deinen SPF-Eintrag um den Dienst, der diese Mail verschickt hat. Den passenden Baustein (include:…) nennt dir der Dienst in seiner Hilfe.';
		case 'dkim':
			return 'Schalte bei dem Dienst, der deine Mails verschickt, die Unterschrift (DKIM) ein und trag den angezeigten Schlüssel in deine DNS-Einstellungen ein.';
		case 'dmarc':
			if (!raw.policy) return 'Leg eine DMARC-Regel an. Den Wert unten kannst du direkt kopieren.';
			if (raw.policy === 'none') return 'Wenn alle deine Dienste sauber unterschreiben, stell die Regel von p=none auf p=quarantine um.';
			return 'Sorg dafür, dass SPF oder DKIM zu deiner Absenderadresse passen. Meist fehlt die Unterschrift des Versanddienstes für deine eigene Domain.';
		case 'reputation': {
			const lists = ((raw.lists ?? []) as Raw[]).filter((l) => l.listed);
			if (lists.length && lists.every((l) => l.pbl)) return 'Verschick über den Postausgangsserver (SMTP mit Anmeldung) deines Mail-Anbieters statt direkt von deinem Internetanschluss.';
			if (lists.length) return `Bei einem Mail-Anbieter: Support kontaktieren. Bei eigenem Server: die Ursache abstellen und dich austragen lassen, z. B. bei ${lists.map((l) => l.list).join(', ')}.`;
			return 'Bitte den Betreiber deines Mailservers, einen passenden Rückwärts-Eintrag (rDNS) für die IP zu setzen.';
		}
		case 'transport':
			return 'Bitte den Betreiber deines Mailservers, TLS 1.2 oder 1.3 für ausgehende Mails einzuschalten.';
		case 'content':
			return 'Ändere die Punkte, die rechts mit Pluspunkten markiert sind, und teste danach noch einmal.';
		default:
			return f?.text ?? '';
	}
}

/** "Was tun" box for hints and problems. */
function fixBox(st: Station, r: MailResult): string {
	if (st.status !== 'warn' && st.status !== 'bad') return '';
	const fs = st.findings.filter((f) => f.status === 'warn' || f.status === 'bad');
	const withSuggestion = fs.find((f) => f.suggestion);
	const guide = fs.find((f) => f.guide)?.guide;
	const copy = withSuggestion?.suggestion
		? `<p class="rv-host">Neuer ${esc(withSuggestion.suggestion.type)}-Eintrag, Name/Host <code>${esc(withSuggestion.suggestion.host)}</code></p><div class="copyrow"><span class="mono">${esc(withSuggestion.suggestion.value)}</span><button type="button" class="copybtn" data-copy="${esc(withSuggestion.suggestion.value)}">${COPY}<span>Kopieren</span></button></div>`
		: '';
	const link = guide ? `<a class="rv-guide" href="/anleitung" data-fix="${guide}">Anleitung für deinen Anbieter ›</a>` : '';
	return `<div class="rv-fix is-${st.status}"><div class="rv-fix-head"><b>Was tun</b>${st.gain > 0 ? `<span class="tag is-ok">+${fmt1(st.gain)} Pkt. bei Behebung</span>` : ''}</div><p>${esc(actionText(st))}</p>${copy}${link}</div>`;
}

export function renderResultView(r: MailResult, opts: ResultViewOptions): string {
	const stations = stationsOf(r.findings);
	const open = initialStation(stations);
	const verdict = r.verdict ?? verdictFor(r.score, stations);
	const warn = stations.filter((s) => s.status === 'warn').length;
	const bad = stations.filter((s) => s.status === 'bad').length;
	const firstBad = stations.findIndex((s) => s.status === 'bad');
	const fill = firstBad < 0 ? 100 : (firstBad / (stations.length - 1)) * 100;
	const band = BANDS[r.band];
	const bandStatus = { risk: 'bad', endangered: 'warn', solid: 'skip', good: 'ok' }[r.band];
	const at = new Date(r.mail?.receivedAt ?? r.createdAt);
	const when = `${at.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Berlin' })} · ${at.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' })}`;
	const duration = rawOf(stations[4], 'transport').durationSec;

	const tabs = stations
		.map(
			(st, i) => `<button type="button" class="rv-st is-${st.status}" role="tab" id="rv-tab-${i}" aria-controls="rv-panel-${i}" aria-selected="${i === open}" tabindex="${i === open ? 0 : -1}" data-station="${i}" style="--i:${i}">
<span class="rv-node">${svg(ICONS[st.id])}<span class="rv-badge" aria-hidden="true">${BADGE[st.status]}</span></span><span class="rv-t">${esc(st.title)}</span><span class="rv-v mono">${esc(stationValue(st))}</span><span class="sr-only">: ${STATUS_WORD[st.status]}</span></button>`,
		)
		.join('');
	const panels = stations
		.map(
			(st, i) => `<section class="rv-panel" role="tabpanel" id="rv-panel-${i}" aria-labelledby="rv-tab-${i}" data-panel="${i}"${i === open ? ' data-open' : ''}>
<div class="rv-explain"><span class="eyebrow">Station ${i + 1} von 6 · ${STATUS_WORD[st.status]}</span><h2 class="h">${esc(stationHeading(st))}</h2><p>${stationText(st)}</p>${fixBox(st, r)}</div>
<div class="rv-vis">${stationVisual(st, r)}</div></section>`,
		)
		.join('');

	const plan = stations
		.filter((s) => s.status === 'bad' || s.status === 'warn')
		.sort((a, b) => b.gain - a.gain);
	const planHtml =
		bad > 1
			? `<section class="card rv-plan" aria-labelledby="rv-plan-title"><span class="eyebrow">Aktionsplan</span><h2 class="h" id="rv-plan-title">Der Reihe nach beheben. Größte Wirkung zuerst.</h2><ol>${plan
					.map((s) => `<li><button type="button" class="rv-goto is-${s.status}" data-goto="${s.index}"><span class="dot"></span><span class="grow"><b>${esc(stationHeading(s))}</b> <small>Station ${s.index + 1} · ${esc(s.title)}</small></span>${s.gain > 0 ? `<span class="mono">+${fmt1(s.gain)} Pkt.</span>` : ''}</button></li>`)
					.join('')}</ol></section>`
			: '';

	const rawAll = JSON.stringify(
		r.findings.map((f) => ({ id: f.id, status: f.status, abzug: f.deductions, raw: f.raw })),
		null,
		2,
	);

	return `<div class="rv" data-rv data-final="${r.score}" data-open="${open}" data-result-id="${esc(r.id)}">
<div class="card rv-head">
	<span class="rv-head-i"><span class="eyebrow">Absender</span><span class="mono" data-mh-from>${esc(r.mail?.from ?? r.fromDomain ?? 'unbekannt')}</span></span>
	${r.mail?.subject ? `<span class="rv-head-i"><span class="eyebrow">Betreff</span><span>${esc(r.mail.subject)}</span></span>` : ''}
	<span class="rv-head-i"><span class="eyebrow">Empfangen</span><span class="mono">${esc(when)}</span></span>
	<a class="rv-new" href="/" data-action="reset">‹ Neuer Test</a>
</div>
<div class="rv-top">
	<div><span class="eyebrow">Ergebnis</span><h1 class="h rv-verdict" data-headline tabindex="-1">${esc(verdict.line1)}<br><span>${esc(verdict.line2)}</span></h1></div>
	<div class="rv-score-col">
		<div class="rv-score"><span class="h rv-num"><span class="rv-sizer" aria-hidden="true">10,0</span><span data-score-value>${fmt1(r.score)}</span></span><span class="rv-of">/ 10</span></div>
		<div class="rv-chips"><span class="tag with-dot is-${bandStatus}">${esc(band.label)}</span>${warn ? `<span class="tag with-dot is-warn">${warn} ${warn === 1 ? 'Hinweis' : 'Hinweise'}</span>` : ''}${bad ? `<span class="tag with-dot is-bad">${bad} ${bad === 1 ? 'Problem' : 'Probleme'}</span>` : ''}</div>
	</div>
</div>
${r.authWarning ? `<div class="card rv-exception" data-auth-warning><span class="tag is-warn">Ausnahme</span><span>SPF, DKIM oder DMARC schlägt fehl. Darum warnen wir, egal wie hoch die Zahl ist: Das allein kann Mails in den Spam schicken.</span></div>` : ''}
<div class="card rv-route">
	<div class="rv-route-head"><span class="eyebrow">Der Weg deiner Mail · 6 Stationen</span>${typeof duration === 'number' ? `<span class="mono rv-dur">Unterwegs ${duration} s</span>` : ''}</div>
	<div class="rv-track${firstBad >= 0 ? ' has-break' : ''}" role="tablist" aria-label="Stationen deiner Mail" style="--fill:${fill}%"><span class="rv-line" aria-hidden="true"><span class="rv-fill"></span></span>${tabs}</div>
	${firstBad >= 0 ? `<p class="rv-stuck" style="--at:${firstBad}">Hier bleibt deine Mail hängen.</p>` : ''}
	<div class="rv-panels">${panels}</div>
</div>
${planHtml}
<div class="rv-bottom">
	<div class="card rv-card"><span class="eyebrow">Was das für dich bedeutet</span><p data-sub>${esc(r.sub)}</p></div>
	<div class="card rv-card"><span class="eyebrow">Für deinen Kunden</span><div class="copyrow"><span class="mono" data-share-url>${esc(opts.shareUrl.replace(/^https?:\/\//, ''))}</span><button type="button" class="copybtn" data-action="share" data-copy="${esc(opts.shareUrl)}" aria-label="Ergebnis-Link kopieren">${COPY}<span>Kopieren</span></button></div><p class="rv-small">Gültig bis ${esc(new Date(r.expiresAt).toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin' }))} · nicht in Google auffindbar</p></div>
	<div class="card rv-card rv-actions"><a class="btn btn-ink" href="/" data-action="retest">Erneut testen</a><button type="button" class="btn btn-line" data-action="source" aria-expanded="false" aria-controls="rv-source">Mail-Quelle &amp; Header</button>${bad && opts.setupUrl ? `<p class="rv-small rv-setup">Keine Zeit? <a href="${esc(opts.setupUrl)}" rel="noopener">Lass es einrichten</a></p>` : ''}</div>
</div>
<section class="card rv-source" id="rv-source" hidden aria-label="Mail-Quelle und Header">
	<div class="rv-source-tabs" role="tablist" aria-label="Ansicht">
		<button type="button" role="tab" aria-selected="true" data-src="text">Text</button><button type="button" role="tab" aria-selected="false" data-src="html">HTML</button><button type="button" role="tab" aria-selected="false" data-src="headers">Header</button><button type="button" role="tab" aria-selected="false" data-src="raw">Rohdaten</button>
	</div>
	<div class="rv-src" data-src-panel="text"><p class="rv-small" data-preview-missing>Text, HTML und Header siehst du nur direkt nach deinem Test. Wir speichern den Inhalt deiner Mail nicht, auch nicht für diesen Link.</p><pre class="rv-pre" data-preview-text hidden></pre></div>
	<div class="rv-src" data-src-panel="html" hidden><p class="rv-small" data-preview-missing>Nur direkt nach deinem Test verfügbar. Externe Bilder und Skripte werden nie geladen.</p><iframe class="rv-frame" title="HTML-Ansicht deiner Mail" sandbox="" data-preview-html hidden></iframe></div>
	<div class="rv-src" data-src-panel="headers" hidden><p class="rv-small" data-preview-missing>Nur direkt nach deinem Test verfügbar.</p><pre class="rv-pre" data-preview-headers hidden></pre></div>
	<div class="rv-src" data-src-panel="raw" hidden><pre class="rv-pre">${esc(rawAll)}</pre></div>
</section>
</div>`;
}

/** Shown by the server for unknown or expired ids. */
export function renderResultMissing(): string {
	return `<div class="rv rv-missing" data-rv-missing><div class="card msg-card"><div class="rv-missing-fig" data-hairline="loupe" data-label="Lupe über einem leeren Blatt: hier ist nichts zu finden"></div><h1 class="h">Ergebnis nicht gefunden</h1><p><b>Hier finden wir nichts mehr.</b></p><p>Ergebnisse sind 7 Tage abrufbar. Danach löschen wir sie automatisch.</p><a class="btn btn-ink" href="/">Neuen Test starten</a></div></div>`;
}

