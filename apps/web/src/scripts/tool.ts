// Mail test UI: drives the screens in Tool.astro from real API events (SSE, polling fallback).
import type { Finding, GuideTopic, MailResult, ProgressEvent, StepId, TestStatus } from '@emc/shared';
import { STEPS } from '@emc/shared';
import { copyText, esc, flash, inline } from './util';

type Screen = 'start' | 'wait' | 'result' | 'guide' | 'msg';

interface GuideStep {
	text: string;
	eintrag?: { typ: string; host: string; wert: string };
}
interface GuideData {
	[provider: string]: { name: string; url: Partial<Record<GuideTopic, string>>; schritte: Partial<Record<GuideTopic, GuideStep[]>> };
}

const STORE_KEY = 'emc-test';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Each check stays visible at least this long, so the animation stays readable when analysis is fast. */
const STEP_MS = reduced ? 120 : 560;

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

async function api<T>(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T }> {
	const res = await fetch(path, { ...init, headers: { Accept: 'application/json' } });
	const data = (await res.json().catch(() => ({}))) as T;
	return { ok: res.ok, status: res.status, data };
}

function storage(): Storage | null {
	try {
		return sessionStorage;
	} catch {
		return null;
	}
}

export function initTool(): void {
	const root = document.getElementById('tool');
	if (!root) return;
	const $ = <T extends Element = HTMLElement>(sel: string) => root.querySelector(sel) as T;
	const $$ = (sel: string) => Array.from(root.querySelectorAll<HTMLElement>(sel));
	const mode = root.dataset.mode as 'test' | 'result';

	let test: Pick<TestStatus, 'id' | 'address' | 'expiresAt'> | null = null;
	let result: MailResult | null = null;
	let source: EventSource | null = null;
	let pollTimer = 0;
	let generation = 0; // invalidates callbacks of an old test after reset
	let guideTopic: GuideTopic = 'dmarc';
	let guides: GuideData | null = null;

	// ---- screens ----
	function show(screen: Screen) {
		for (const el of $$('[data-screen]')) el.hidden = el.dataset.screen !== screen;
		document.body.dataset.toolState = screen;
	}
	function announce(text: string) {
		$('[data-announce]').textContent = text;
	}
	function message(title: string, text: string) {
		$('[data-msg-title]').textContent = title;
		$('[data-msg-text]').textContent = text;
		show('msg');
		$('[data-msg-title]').focus();
	}

	// ---- test lifecycle ----
	async function newTest(): Promise<void> {
		const gen = ++generation;
		closeStream();
		result = null;
		resetAnimation();
		show('start');
		$('[data-address]').innerHTML = '<span class="address-loading">Adresse wird erstellt …</span>';
		$$('[data-action="copy"], [data-action="sent"]').forEach((b) => ((b as HTMLButtonElement).disabled = true));
		const res = await api<TestStatus & { message?: string }>('/api/tests', { method: 'POST' }).catch(() => null);
		if (gen !== generation) return;
		if (!res || !res.ok) {
			message('Gerade geht es nicht', res?.data?.message ?? 'Der Test-Server ist nicht erreichbar. Probier es in einer Minute noch einmal.');
			return;
		}
		test = { id: res.data.id, address: res.data.address, expiresAt: res.data.expiresAt };
		storage()?.setItem(STORE_KEY, JSON.stringify(test));
		showAddress();
		listen(gen);
	}

	function showAddress() {
		if (!test) return;
		const [local, domain] = test.address.split('@');
		$('[data-address]').innerHTML = `<span class="nw">${esc(local)}@</span><wbr><span class="nw">${esc(domain)}</span>`;
		$('[data-address-small]').textContent = test.address;
		$$('[data-action="copy"], [data-action="sent"]').forEach((b) => ((b as HTMLButtonElement).disabled = false));
	}

	async function resumeOrCreate() {
		const saved = storage()?.getItem(STORE_KEY);
		if (saved) {
			try {
				const t = JSON.parse(saved) as typeof test;
				const res = await api<TestStatus>(`/api/tests/${t!.id}`);
				if (res.ok && res.data.state === 'waiting') {
					test = t;
					showAddress();
					listen(++generation);
					return;
				}
			} catch {
				/* fall through to a new test */
			}
			storage()?.removeItem(STORE_KEY);
		}
		await newTest();
	}

	function closeStream() {
		source?.close();
		source = null;
		clearTimeout(pollTimer);
	}

	function listen(gen: number) {
		if (!test) return;
		const id = test.id;
		if ('EventSource' in window) {
			source = new EventSource(`/api/tests/${id}/events`);
			const handle = (e: MessageEvent) => gen === generation && onEvent(JSON.parse(e.data) as ProgressEvent);
			for (const type of ['step', 'done', 'error', 'expired']) source.addEventListener(type, handle as EventListener);
			let failures = 0;
			source.onerror = () => {
				// The browser reconnects by itself; after repeated failures switch to polling.
				if (++failures >= 3 || source?.readyState === EventSource.CLOSED) {
					source?.close();
					poll(gen, id);
				}
			};
			source.onopen = () => (failures = 0);
		} else {
			poll(gen, id);
		}
	}

	const seen = new Set<string>();
	async function poll(gen: number, id: string) {
		if (gen !== generation) return;
		const res = await api<TestStatus>(`/api/tests/${id}`).catch(() => null);
		if (gen !== generation) return;
		if (res?.ok) {
			for (const step of res.data.done) if (!seen.has(step)) onEvent({ type: 'step', step });
			if (res.data.state === 'done' && res.data.resultId) return onEvent({ type: 'done', resultId: res.data.resultId });
			if (res.data.state === 'expired') return onEvent({ type: 'expired' });
			if (res.data.state === 'error') return onEvent({ type: 'error', message: '' });
		}
		pollTimer = window.setTimeout(() => poll(gen, id), 2000);
	}

	function onEvent(e: ProgressEvent) {
		if (e.type === 'step') {
			if (seen.has(e.step)) return;
			seen.add(e.step);
		}
		if (e.type === 'expired') {
			closeStream();
			storage()?.removeItem(STORE_KEY);
			return message('Diese Adresse ist abgelaufen', 'Testadressen gelten 60 Minuten und nehmen genau eine Mail an. Hol dir einfach eine neue.');
		}
		if (e.type === 'error') {
			closeStream();
			storage()?.removeItem(STORE_KEY);
			return message('Da ist etwas schiefgelaufen', 'Die Auswertung deiner Mail ist fehlgeschlagen. Starte bitte einen neuen Test.');
		}
		if (e.type === 'done') closeStream();
		if (root!.querySelector('[data-screen="start"]:not([hidden])')) goWait();
		queue.push(e);
		pump();
	}

	// ---- animation, driven by the event queue ----
	const queue: ProgressEvent[] = [];
	let pumping = false;
	let doneCount = 0;

	function resetAnimation() {
		queue.length = 0;
		seen.clear();
		doneCount = 0;
		for (const li of $$('[data-step]')) li.dataset.state = 'pending';
		$$('[data-step]')[0].dataset.state = 'active';
		$('[data-orb]').className = 'orb waiting';
		$('[data-prog]').style.setProperty('--p', '0%');
		$('[data-sat]').hidden = false;
		$('[data-burst]').hidden = true;
		$('[data-scan]').hidden = true;
		$('[data-env-wait]').removeAttribute('hidden');
		$('[data-env-got]').setAttribute('hidden', '');
		$('[data-wait-title]').textContent = 'Wir warten auf deine Mail';
		$('[data-wait-sub]').textContent = 'Die Seite aktualisiert sich von selbst';
	}

	function goWait() {
		if (!$('[data-screen="wait"]').hidden) return;
		show('wait');
		$('[data-wait-title]').focus?.();
	}

	const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

	async function pump() {
		if (pumping) return;
		pumping = true;
		const gen = generation;
		while (queue.length && gen === generation) {
			const e = queue.shift()!;
			if (e.type === 'step') {
				markDone(e.step);
				await sleep(e.step === 'received' ? STEP_MS * 1.4 : STEP_MS);
			} else if (e.type === 'done') {
				await finish(e.resultId, gen);
			}
		}
		pumping = false;
	}

	function markDone(step: StepId) {
		const idx = STEPS.indexOf(step);
		const items = $$('[data-step]');
		items[idx].dataset.state = 'done';
		if (items[idx + 1]) items[idx + 1].dataset.state = 'active';
		doneCount = items.filter((li) => li.dataset.state === 'done').length;
		$('[data-prog]').style.setProperty('--p', `${Math.round((doneCount / STEPS.length) * 100)}%`);
		if (step === 'received') {
			$('[data-orb]').className = 'orb';
			$('[data-env-wait]').setAttribute('hidden', '');
			$('[data-env-got]').removeAttribute('hidden');
			$('[data-scan]').hidden = false;
			$('[data-wait-title]').textContent = 'Mail ist da. Wir prüfen sie';
			announce('Mail empfangen. Die Prüfung läuft.');
		}
		$('[data-wait-sub]').textContent = doneCount >= STEPS.length ? `Alle ${STEPS.length} Checks erledigt` : `Check ${doneCount} von ${STEPS.length}`;
	}

	async function finish(resultId: string, gen: number) {
		const res = await api<MailResult>(`/api/results/${resultId}`).catch(() => null);
		if (gen !== generation) return;
		$('[data-scan]').hidden = true;
		$('[data-sat]').hidden = true;
		$('[data-burst]').hidden = false;
		$('[data-orb]').className = 'orb done';
		$('[data-wait-title]').textContent = 'Fertig, gleich kommt dein Ergebnis';
		storage()?.removeItem(STORE_KEY);
		await sleep(reduced ? 200 : 1100);
		if (gen !== generation) return;
		if (!res?.ok) return message('Ergebnis nicht gefunden', 'Das Ergebnis konnte nicht geladen werden. Starte bitte einen neuen Test.');
		history.pushState({ resultId }, '', `/ergebnis/${resultId}`);
		renderResult(res.data);
	}

	// ---- result ----
	const fmt = (n: number) => n.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
	const COPY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';
	const CHEVRON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
	const BAND_LABEL: Record<MailResult['band'], string> = { risk: 'Hohes Risiko', endangered: 'Gefährdet', solid: 'Solide', good: 'Sehr gut' };
	const BAND_STATUS: Record<MailResult['band'], string> = { risk: 'bad', endangered: 'warn', solid: 'skip', good: 'ok' };
	const IMPACT: Record<string, { label: string; cls: string }> = {
		hoch: { label: 'Hohe Wirkung', cls: 'is-bad' },
		mittel: { label: 'Mittlere Wirkung', cls: 'is-warn' },
		gering: { label: 'Geringe Wirkung', cls: '' },
	};
	const reduced2 = reduced;

	const copyRow = (value: string, label = 'Kopieren') =>
		`<div class="copyrow"><span class="mono">${esc(value)}</span><button type="button" class="copybtn" data-copy="${esc(value)}">${COPY_ICON}<span>${label}</span></button></div>`;

	/** Short technical detail for the "passed" list. */
	function passedDetail(f: Finding): string {
		const raw = f.raw as Record<string, unknown>;
		if (f.id === 'spf') return `SPF · ${raw.result ?? 'pass'}`;
		if (f.id === 'dkim') {
			const sig = (raw.signatures as { bits?: number | null; selector?: string }[] | undefined)?.find((s) => s.selector);
			return sig?.bits ? `DKIM · ${sig.bits} Bit` : sig?.selector ? `DKIM · ${sig.selector}` : 'DKIM · pass';
		}
		if (f.id === 'dmarc') return `DMARC · p=${raw.policy ?? '?'}`;
		if (f.id === 'reputation') {
			const lists = (raw.lists as { listed: boolean | null }[] | undefined) ?? [];
			const checked = lists.filter((l) => l.listed !== null).length;
			return `IP · 0 von ${checked} Listen`;
		}
		if (f.id === 'content') return `Spam-Score ${raw.rspamdScore ?? 0}`;
		return f.tech;
	}

	function countUp(el: HTMLElement, to: number) {
		if (reduced2) return void (el.textContent = fmt(to));
		const start = performance.now();
		const dur = 900;
		const tick = (now: number) => {
			const t = Math.min(1, (now - start) / dur);
			const eased = 1 - Math.pow(1 - t, 3);
			el.textContent = fmt(Math.round(to * eased * 10) / 10);
			if (t < 1) requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);
	}

	function renderResult(r: MailResult) {
		result = r;
		// Mail header
		const m = r.mail;
		$('[data-mh-from]').textContent = m?.from ?? r.fromDomain ?? 'unbekannt';
		// Subject is only kept in RAM for an hour, a later shared link has none.
		$('[data-mh-subject]').textContent = m?.subject ?? '';
		$('[data-mh-subject]').closest<HTMLElement>('[data-mh-row]')!.hidden = !m?.subject;
		const at = new Date(m?.receivedAt ?? r.createdAt);
		$('[data-mh-time]').textContent = `${at.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} · ${at.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;

		// Verdict + score
		$('[data-headline]').textContent = r.headline;
		$('[data-sub]').textContent = r.sub;
		const band = $('[data-band]');
		band.className = `tag with-dot is-${BAND_STATUS[r.band] ?? 'skip'}`;
		band.textContent = BAND_LABEL[r.band] ?? '';
		countUp($('[data-score]'), r.score);
		$('[data-auth-warning]').hidden = !r.authWarning;

		// Sub scores
		const subs: [string, number | null][] = [
			['Authentifizierung', r.subScores?.auth ?? null],
			['Server-Ruf', r.subScores?.reputation ?? null],
			['Inhalt', r.subScores?.content ?? null],
		];
		$('[data-subs]').innerHTML = subs
			.filter(([, v]) => v !== null)
			.map(([label, v]) => {
				const cls = v! >= 90 ? 'is-ok' : v! >= 60 ? 'is-warn' : 'is-bad';
				return `<div class="sub-row ${cls}"><div class="sub-row-head"><strong>${label}</strong><span class="mono">${v} %</span></div><div class="bar"><i data-w="${v}"></i></div></div>`;
			})
			.join('');
		requestAnimationFrame(() =>
			requestAnimationFrame(() => {
				for (const bar of $$('[data-subs] .bar i')) bar.style.transform = `scaleX(${Number(bar.dataset.w) / 100})`;
			}),
		);

		// Action plan: problems and hints, biggest effect first
		const todo = r.findings.filter((f) => f.status === 'bad' || f.status === 'warn');
		$('[data-plan-head]').hidden = todo.length === 0;
		// The first card that has a fix starts open (a blocklist entry has no DNS fix).
		const firstFix = todo.findIndex((f) => f.suggestion || f.guide);
		$('[data-plan]').innerHTML = todo
			.map((f, i) => {
				const gain = f.gain ?? f.deductions.reduce((s, d) => s + d.points, 0);
				const impact = IMPACT[f.impact ?? 'gering'];
				const hasFix = !!(f.suggestion || f.guide);
				const open = i === firstFix;
				const fix = hasFix
					? `<div class="action-fix" id="fix-${i}" ${open ? '' : 'hidden'}>
							${f.suggestion ? `<p class="copybox-host">Neuer ${esc(f.suggestion.type)}-Eintrag, Name/Host <code>${esc(f.suggestion.host)}</code></p>${copyRow(f.suggestion.value)}` : ''}
							${f.guide ? `<button type="button" class="action-guide" data-fix="${f.guide}">Anleitung für deinen Anbieter ›</button>` : ''}
						</div>`
					: '';
				return `<li class="card action ${f.status === 'bad' ? 'is-bad' : 'is-warn'}" style="--d:${0.25 + i * 0.09}s">
					<div class="action-meta">
						<span class="action-num">${String(i + 1).padStart(2, '0')}</span>
						${gain > 0 ? `<span class="tag ${impact.cls}">${impact.label}</span>` : '<span class="tag">Tipp</span>'}
						${gain > 0 ? `<span class="action-gain">+${fmt(gain)} Pkt.</span>` : ''}
					</div>
					<h3 class="action-title">${esc(f.title)} <span class="mono">${esc(f.tech)}</span></h3>
					<p class="action-text">${esc(f.text)}</p>
					${hasFix ? `<button type="button" class="action-toggle" aria-expanded="${open}" aria-controls="fix-${i}">So behebst du das ${CHEVRON}</button>${fix}` : ''}
				</li>`;
			})
			.join('');

		// Passed checks (never show "not checked" entries)
		const passed = r.findings.filter((f) => f.status === 'ok');
		const tlsRow = r.mail?.tls?.used ? `<li class="passed-item is-ok"><span class="dot"></span><span class="grow">Verschlüsselt übertragen</span><span class="mono">${esc(r.mail.tls.version ?? 'TLS')}</span></li>` : '';
		const count = passed.length + (tlsRow ? 1 : 0);
		$('[data-passed-wrap]').hidden = count === 0;
		$('[data-passed-head]').textContent = count === 1 ? '1 Prüfung bestanden' : `${count} Prüfungen bestanden`;
		$('[data-passed]').innerHTML =
			passed.map((f) => `<li class="passed-item is-ok"><span class="dot"></span><span class="grow">${esc(f.title)}</span><span class="mono">${esc(passedDetail(f))}</span></li>`).join('') + tlsRow;

		// Share link
		const url = `${location.origin}/ergebnis/${r.id}`;
		$('[data-share-url]').textContent = url.replace(/^https?:\/\//, '');
		const until = new Date(r.expiresAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
		$('[data-share-note]').textContent = `Gültig bis ${until} · nicht in Google auffindbar`;
		$('[data-setup]').hidden = !r.findings.some((f) => f.status === 'bad');

		// Technical details
		const block = (title: string, rows: [string, unknown][]) =>
			`<div class="tech-block"><h3>${esc(title)}</h3><dl>${rows
				.filter(([, v]) => v !== null && v !== undefined && v !== '')
				.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(typeof v === 'string' ? v : JSON.stringify(v))}</dd>`)
				.join('')}</dl></div>`;
		$('[data-tech]').innerHTML =
			block('Mail', [
				['from', m?.from],
				['subject', m?.subject],
				['received', m?.receivedAt],
				['tls', m?.tls?.used ? (m.tls.version ?? 'ja') : 'nein'],
				['score', `${r.score} (${r.band})`],
			]) +
			r.findings
				.filter((f) => f.status !== 'skip' || Object.keys(f.raw ?? {}).length)
				.map((f) => block(`${f.tech} · ${f.status}${f.deductions.length ? ` · −${fmt(f.deductions.reduce((s, d) => s + d.points, 0))}` : ''}`, Object.entries(f.raw ?? {})))
				.join('');

		show('result');
		window.scrollTo({ top: 0 });
		announce(`Ergebnis: ${fmt(r.score)} von 10, ${BAND_LABEL[r.band]}. ${r.headline}`);
		$('[data-headline]').focus({ preventScroll: true });
		if (!reduced && 'vibrate' in navigator && matchMedia('(pointer: coarse)').matches) navigator.vibrate?.([12, 40, 18]);
	}

	// ---- guide ----
	async function openGuide(topic: GuideTopic) {
		guideTopic = topic;
		$('[data-guide-title]').textContent = TOPIC_TITLES[topic].title;
		$('[data-guide-lead]').textContent = TOPIC_TITLES[topic].lead;
		$('#provider-label').textContent = topic === 'dkim' ? 'Wer verschickt deine Mails?' : 'Wo liegt deine Domain?';
		show('guide');
		$('[data-guide-title]').focus({ preventScroll: true });
		window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
		if (!guides) guides = await fetch('/anleitungen.json').then((r) => r.json() as Promise<GuideData>).catch(() => ({}));
		let provider: string | null = null;
		try {
			provider = localStorage.getItem('emc-provider');
		} catch {
			/* no storage */
		}
		provider = (result && guessProvider(result)) ?? provider ?? 'ionos';
		pickProvider(provider);
	}

	function pickProvider(provider: string) {
		for (const chip of $$('[data-provider]')) chip.setAttribute('aria-pressed', String(chip.dataset.provider === provider));
		try {
			localStorage.setItem('emc-provider', provider);
		} catch {
			/* no storage */
		}
		const g = guides?.[provider];
		const steps = g?.schritte[guideTopic] ?? GENERIC[guideTopic];
		const domain = result?.fromDomain ?? 'deine-domain.de';
		$('[data-guide-steps]').innerHTML = steps
			.map((s, i) => {
				const fill = (v: string) => v.replaceAll('{domain}', domain);
				const box = s.eintrag
					? `<div class="copybox"><p class="copybox-host">Typ <code>${esc(s.eintrag.typ)}</code> · Name/Host <code>${esc(fill(s.eintrag.host))}</code></p>${copyRow(fill(s.eintrag.wert))}</div>`
					: '';
				return `<li class="gstep"><span class="gnum" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><div class="gtext"><p>${inline(s.text)}</p>${box}</div></li>`;
			})
			.join('');
		const link = $<HTMLAnchorElement>('[data-guide-link]');
		link.href = g?.url[guideTopic] ?? `/wissen/${guideTopic}`;
		link.textContent = g ? `Ausführliche Anleitung für ${g.name}` : 'Ausführlich erklärt';
	}

	// ---- actions ----
	root.addEventListener('click', async (ev) => {
		const t = ev.target as HTMLElement;
		const btn = t.closest<HTMLElement>('button, [data-action]');
		if (!btn) return;
		const action = btn.dataset.action;
		if (action === 'copy' && test) {
			await copyText(test.address);
			flash(btn, 'Kopiert');
		} else if (action === 'sent') {
			goWait();
		} else if (action === 'reset' || action === 'retest') {
			if (mode === 'result') return void (location.href = '/');
			storage()?.removeItem(STORE_KEY);
			history.pushState({}, '', '/');
			await newTest();
			window.scrollTo({ top: 0 });
			$<HTMLButtonElement>('.copy-address').focus({ preventScroll: true });
		} else if (action === 'share' && result) {
			const url = `${location.origin}/ergebnis/${result.id}`;
			if (navigator.share && matchMedia('(pointer: coarse)').matches) {
				navigator.share({ title: `E-Mail-Check: ${fmt(result.score)} von 10`, url }).catch(() => undefined);
			} else {
				await copyText(url);
				flash(btn, 'Kopiert');
			}
		} else if (action === 'back') {
			show('result');
			$('[data-headline]').focus();
		} else if (btn.dataset.fix) {
			openGuide(btn.dataset.fix as GuideTopic);
		} else if (btn.dataset.provider) {
			pickProvider(btn.dataset.provider);
		} else if (btn.dataset.copy !== undefined) {
			await copyText(btn.dataset.copy);
			flash(btn, 'Kopiert');
		} else if (btn.classList.contains('action-toggle')) {
			const body = document.getElementById(btn.getAttribute('aria-controls')!)!;
			const open = btn.getAttribute('aria-expanded') !== 'true';
			btn.setAttribute('aria-expanded', String(open));
			body.hidden = !open;
		} else if (btn.classList.contains('check-row')) {
			const body = document.getElementById(btn.getAttribute('aria-controls')!)!;
			const open = btn.getAttribute('aria-expanded') !== 'true';
			btn.setAttribute('aria-expanded', String(open));
			body.hidden = !open;
		}
	});
	// Header button lives outside the tool section.
	document.querySelectorAll<HTMLElement>('.site-header [data-action="reset"]').forEach((b) =>
		b.addEventListener('click', () => root.querySelector<HTMLElement>('[data-new-test]')?.click()),
	);

	window.addEventListener('popstate', () => {
		if (location.pathname === '/' && mode === 'test') newTest();
	});

	// ---- boot ----
	if (mode === 'result') {
		const id = location.pathname.split('/').filter(Boolean)[1] ?? '';
		api<MailResult & { message?: string }>(`/api/results/${encodeURIComponent(id)}`)
			.then((res) => (res.ok ? renderResult(res.data) : message('Ergebnis nicht gefunden', 'Ergebnisse werden nach 7 Tagen automatisch gelöscht. Mach einfach einen neuen Test.')))
			.catch(() => message('Gerade geht es nicht', 'Der Server ist nicht erreichbar. Probier es gleich noch einmal.'));
	} else {
		resetAnimation();
		resumeOrCreate();
	}
}
