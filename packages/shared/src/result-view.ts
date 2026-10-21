// Result page V2 as one HTML renderer.
// Used by the browser after a live test and by the engine for shared links (server-side, via Caddy templates),
// so everything is visible without JavaScript. JS only switches stations and runs the animations.
import { ruleTitle } from './rspamd.ts';
import { BANDS, STATUS_RANK, verdictFor } from './scoring.ts';
import { sceneConfig, STATE_WORD } from './scene.ts';
import { stationsOf, type Station, type StationId } from './stations.ts';
import { proTipsOf, todosOf, type Todo, type TodoRecord } from './todo.ts';
import type { MailResult, Status } from './types.ts';

export interface ResultViewOptions {
	/** Absolute share URL of this result. */
	shareUrl: string;
	/** dbw media setup offer ("{check}" becomes utm_content). Only right after the person's own test, never on the shared link. */
	setupUrl?: string;
}

export function esc(s: unknown): string {
	return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** A score or points with one decimal, German style (also used by the web app). */
export const fmt1 = (n: number) => n.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
/** Time on the way: "< 1 s" below a second, nothing for implausible values (clock skew, wrong headers). */
export const fmtDuration = (sec: unknown): string | null => (typeof sec !== 'number' || sec < 0 || sec > 3600 ? null : sec < 1 ? '< 1 s' : `${Math.round(sec)} s`);
const fmt = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 1 });
type Raw = Record<string, any>;
const rawOf = (st: Station | undefined, id: string): Raw => (st?.findings.find((f) => f.id === id)?.raw ?? {}) as Raw;

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
/** The copy icon of copy rows (also used by the provider guides in the web app). */
export const COPY = svg('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>', 16, 2);

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
const rank = (s: Status) => STATUS_RANK[s];

function stationText(st: Station): string {
	const checked = st.findings.filter((f) => f.status !== 'skip');
	if (!checked.length) return esc(st.findings[0]?.text ?? 'Diese Station konnten wir bei diesem Test nicht prüfen.');
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
			return `<span class="eyebrow">Zustellweg</span><div class="h rv-big">${hops.length} <small>Stationen${fmtDuration(t.durationSec) ? ` · ${fmtDuration(t.durationSec)} unterwegs` : ''}</small></div><div class="rv-chain">${line}</div><span class="eyebrow">Verschlüsselung</span><div class="rv-tls">${tls}</div>${rawBox([
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

/** Short name of a passed check for the chips row. */
const PASSED_LABEL: Record<string, string> = { spf: 'SPF', sender: 'Eigene Domain', dkim: 'DKIM', dmarc: 'DMARC', reputation: 'Server-Ruf', transport: 'TLS', content: 'Inhalt' };

/** The value of a record with its placeholder marked. */
function recordValue(rec: TodoRecord): string {
	const v = esc(rec.value);
	return rec.placeholder ? v.replace(esc(rec.placeholder), `<mark title="Durch deine Adresse ersetzen">${esc(rec.placeholder)}</mark>`) : v;
}

function recordBox(rec: TodoRecord): string {
	return `<div class="rv-record"><p class="rv-host">Typ <code>${esc(rec.type)}</code> · Name/Host <code>${esc(rec.host)}</code></p><div class="copyrow"><span class="mono">${recordValue(rec)}</span><button type="button" class="copybtn" data-copy="${esc(rec.value)}">${COPY}<span>Kopieren</span></button></div>${rec.placeholder ? `<p class="rv-small">Ersetze <mark>${esc(rec.placeholder)}</mark> durch eine Adresse, an die die Berichte gehen sollen.</p>` : ''}</div>`;
}

/** "Kein Bock auf DNS?" line: only for the person who just tested (never on the shared link). */
function setupLine(opts: ResultViewOptions, check: string): string {
	if (!opts.setupUrl) return '';
	const href = opts.setupUrl.replace('{check}', encodeURIComponent(check));
	return `<p class="rv-setup">Kein Bock auf DNS? <a href="${esc(href)}" target="_blank" rel="noopener">dbw media richtet das für dich ein ›</a><small>Angebot von dbw media, der Agentur hinter diesem Projekt</small></p>`;
}

function todoCard(t: Todo, i: number, opts: ResultViewOptions): string {
	const links = [...(t.guide ? [t.guide] : []), ...(t.links ?? [])].map((l) => `<a class="rv-todo-link" href="${esc(l.href)}"${/^https?:/.test(l.href) ? ' target="_blank" rel="noopener"' : ''}>${esc(l.label)}</a>`).join('');
	const check = t.recheck ? `<button type="button" class="btn btn-line rv-recheck" data-action="recheck">Eingetragen? Jetzt prüfen</button>` : '';
	return `<li class="card rv-todo is-${t.status}" data-todo data-station="${t.station}" data-gain="${t.gain}"${t.recheck ? ` data-recheck="${esc(JSON.stringify(t.recheck))}"` : ''}>
<div class="rv-todo-head"><span class="rv-todo-n" aria-hidden="true">${i + 1}</span><span class="rv-todo-mark" aria-hidden="true">${BADGE[t.status]}</span><h3 class="h">${esc(t.title)}</h3>${t.gain > 0 ? `<span class="tag is-ok">+${fmt1(t.gain)} Pkt.</span>` : ''}<span class="sr-only">${t.status === 'bad' ? 'Problem' : 'Hinweis'}</span></div>
<p>${esc(t.why)}</p>${t.record ? recordBox(t.record) : ''}${links || check ? `<div class="rv-todo-actions">${check}${links}</div>` : ''}<p class="rv-todo-status" data-todo-status aria-live="polite"></p>${setupLine(opts, t.check)}</li>`;
}

export function renderResultView(r: MailResult, opts: ResultViewOptions): string {
	const stations = stationsOf(r.findings);
	const verdict = r.verdict ?? verdictFor(r.score, stations);
	const warn = stations.filter((s) => s.status === 'warn').length;
	const bad = stations.filter((s) => s.status === 'bad').length;
	const band = BANDS[r.band];
	const bandStatus = { risk: 'bad', endangered: 'warn', solid: 'skip', good: 'ok' }[r.band];
	const at = new Date(r.mail?.receivedAt ?? r.createdAt);
	const when = `${at.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Berlin' })} · ${at.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' })}`;
	const duration = fmtDuration(rawOf(stations.find((s) => s.id === 'transport'), 'transport').durationSec);
	// The replay of this one mail (apps/web/scenes/mailroute.js): states per station plus details for the objects.
	const scene = sceneConfig(stations);
	const sceneLabel = `Der Weg deiner Mail: ${stations.map((st, i) => `Station ${i + 1} ${st.title}: ${STATE_WORD[st.status]}`).join(', ')}.`;
	const todos = todosOf(r);

	const todoHtml = todos.length
		? `<section class="rv-todos" aria-labelledby="rv-todo-title"><h2 class="h rv-todo-title" id="rv-todo-title">Das solltest du tun <span>· ${todos.length} ${todos.length === 1 ? 'Schritt' : 'Schritte'}</span></h2><ol>${todos.map((t, i) => todoCard(t, i, opts)).join('')}</ol>
<div class="rv-todo-end"><span>Alles erledigt?</span><a class="btn btn-ink" href="/" data-action="retest">Erneut testen</a></div>${setupLine(opts, todos[0].check)}</section>`
		: `<section class="card rv-green"><span class="eyebrow">Alles im grünen Bereich</span><h2 class="h">Hier gibt es nichts zu tun.</h2><p>Deine Mail ist sauber eingerichtet. Wenn du noch weiter gehen willst, sind das die nächsten Stufen. Beides ist freiwillig.</p>${proTipsOf(r)
				.map((t) => `<div class="rv-tip-pro"><b>${esc(t.title)}</b><p>${esc(t.text)}</p>${t.record ? recordBox(t.record) : ''}</div>`)
				.join('')}</section>`;

	const hots = stations
		.map((st, i) => `<button type="button" class="rv-hot is-${st.status}" data-station="${i}" aria-expanded="false" aria-controls="rv-panel-${i}" aria-label="Station ${i + 1} ${esc(st.title)}: ${STATE_WORD[st.status]}"></button>`)
		.join('');
	const panels = stations
		.map(
			(st, i) => `<section class="rv-panel" id="rv-panel-${i}" data-panel="${i}" aria-label="Station ${i + 1} ${esc(st.title)}" hidden>
<div class="rv-explain"><span class="eyebrow">Station ${i + 1} von 6 · ${esc(st.title)} · ${STATUS_WORD[st.status]}</span><h2 class="h">${esc(stationHeading(st))}</h2><p>${stationText(st)}</p></div>
<div class="rv-vis">${stationVisual(st, r)}</div></section>`,
		)
		.join('');
	const passed = r.findings.filter((f) => f.status === 'ok');
	const passedHtml = passed.length
		? `<details class="card rv-passed"><summary><span class="eyebrow">Bestanden</span><span class="rv-passed-chips">${passed.map((f) => `<span class="tag with-dot is-ok">${esc(PASSED_LABEL[f.id] ?? f.tech)}</span>`).join('')}</span><span class="rv-passed-more">Details</span></summary><ul>${passed.map((f) => `<li><b>${esc(f.title)}</b> <span>${esc(f.text)}</span></li>`).join('')}</ul></details>`
		: '';

	const rawAll = JSON.stringify(
		r.findings.map((f) => ({ id: f.id, status: f.status, abzug: f.deductions, raw: f.raw })),
		null,
		2,
	);

	return `<div class="rv" data-rv data-final="${r.score}" data-result-id="${esc(r.id)}">
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
		<p class="rv-provisional" data-provisional hidden>vorläufig, ohne neue Testmail</p>
		<div class="rv-chips"><span class="tag with-dot is-${bandStatus}">${esc(band.label)}</span>${warn ? `<span class="tag with-dot is-warn">${warn} ${warn === 1 ? 'Hinweis' : 'Hinweise'}</span>` : ''}${bad ? `<span class="tag with-dot is-bad">${bad} ${bad === 1 ? 'Problem' : 'Probleme'}</span>` : ''}</div>
		<a class="rv-scale" href="/#zahl">Was bedeutet die Zahl? ›</a>
	</div>
</div>
${r.authWarning ? `<div class="card rv-exception" data-auth-warning><span class="tag is-warn">Ausnahme</span><span>SPF, DKIM oder DMARC schlägt fehl. Darum warnen wir, egal wie hoch die Zahl ist: Das allein kann Mails in den Spam schicken.</span></div>` : ''}
${todoHtml}
<div class="card rv-route">
	<div class="rv-route-head"><span class="eyebrow">Der Weg deiner Mail · Station anklicken für Details</span>${duration ? `<span class="mono rv-dur">Unterwegs ${duration}</span>` : ''}</div>
	<div class="rv-stage"><div class="rv-scene" data-rv-scene data-states="${scene.states.join(',')}" data-details="${esc(JSON.stringify(scene.details))}" data-label="${esc(sceneLabel)}"></div><div class="rv-hots" role="group" aria-label="Stationen deiner Mail">${hots}</div></div>
	<div class="rv-panels">${panels}</div>
</div>
${passedHtml}
<div class="rv-bottom">
	<div class="card rv-card"><span class="eyebrow">Was das für dich bedeutet</span><p data-sub>${esc(r.sub)}</p></div>
	<div class="card rv-card"><span class="eyebrow">Für deinen Kunden</span><div class="copyrow"><span class="mono" data-share-url>${esc(opts.shareUrl.replace(/^https?:\/\//, ''))}</span><button type="button" class="copybtn" data-action="share" data-copy="${esc(opts.shareUrl)}" aria-label="Ergebnis-Link kopieren">${COPY}<span>Kopieren</span></button></div><p class="rv-small">Gültig bis ${esc(new Date(r.expiresAt).toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin' }))} · nicht in Google auffindbar</p></div>
	<div class="card rv-card rv-actions">${todos.length ? '' : '<a class="btn btn-ink" href="/" data-action="retest">Erneut testen</a>'}<button type="button" class="btn btn-line" data-action="source" aria-expanded="false" aria-controls="rv-source">Mail-Quelle &amp; Header</button></div>
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

