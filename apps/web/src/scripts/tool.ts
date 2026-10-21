// Mail test UI: drives the screens in Tool.astro from real API events (SSE, polling fallback).
// The result behaviour lives in tool-result.ts, the provider guide in tool-guide.ts.
import type { GuideTopic, MailPreview, MailResult, ProgressEvent, StepId, TestStatus } from '@emc/shared';
import { fmt1 as fmt, STEPS } from '@emc/shared';
import { createGuide } from './tool-guide';
import { createResultView, loadRender } from './tool-result';
import { copyText, esc, flash } from './util';

type Screen = 'start' | 'wait' | 'result' | 'guide' | 'msg';

const STORE_KEY = 'emc-test';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Each check stays visible at least this long, so the animation stays readable when analysis is fast. */
const STEP_MS = reduced ? 120 : 560;

/** Rotating tips while we wait for the mail. */
const WAIT_TIPS = [
	'Tipp: Schick die Mail aus deinem echten Postfach, mit Signatur. Dann ist das Ergebnis ehrlich.',
	'Tipp: Du kannst die Adresse auch in dein Kontaktformular oder Newsletter-Tool eintragen.',
	'Wir prüfen gleich sechs Stationen: Absender, Unterschrift, Schutzregel, Server-Ruf, Transport und Posteingang.',
	'Gut zu wissen: Den Inhalt deiner Mail speichern wir nicht. Er wird direkt nach der Prüfung gelöscht.',
];
const WAIT_HELP = 'Noch nichts da? Prüf, ob die Adresse genau stimmt. Manche Postfächer brauchen ein bis zwei Minuten.';

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

const validMinutes = (t: { createdAt?: string; expiresAt: string }) => (t.createdAt ? Math.round((new Date(t.expiresAt).getTime() - new Date(t.createdAt).getTime()) / 60_000) : 60);


export function initTool(): void {
	const root = document.getElementById('tool');
	if (!root) return;
	const $ = <T extends Element = HTMLElement>(sel: string) => root.querySelector(sel) as T;
	const $$ = (sel: string) => Array.from(root.querySelectorAll<HTMLElement>(sel));
	const mode = root.dataset.mode as 'test' | 'result';

	let test: Pick<TestStatus, 'id' | 'address' | 'expiresAt'> & { createdAt?: string } | null = null;
	let result: MailResult | null = null;
	let source: EventSource | null = null;
	let pollTimer = 0;
	let generation = 0; // invalidates callbacks of an old test after reset
	/** The mail itself from the live done event. Only in this page's memory, never stored. */
	let preview: MailPreview | null = null;
	/** Subject and sender from the live "received" step: only in this page, never from the result link (audit C3). */
	let liveMail: { from: string | null; subject: string | null } | null = null;

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
		liveMail = null;
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
		test = { id: res.data.id, address: res.data.address, createdAt: res.data.createdAt, expiresAt: res.data.expiresAt };
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
		const mailto = `mailto:${test.address}?subject=${encodeURIComponent('Kurzer Test')}&body=${encodeURIComponent('Hallo,\n\ndas ist ein Test meiner Mail-Einstellungen.\n\nViele Grüße')}`;
		for (const a of $$('[data-mailto]')) {
			a.setAttribute('href', mailto);
			a.removeAttribute('aria-disabled');
		}
	}

	async function resumeOrCreate() {
		const saved = storage()?.getItem(STORE_KEY);
		if (saved) {
			try {
				const t = JSON.parse(saved) as typeof test;
				const res = await api<TestStatus>(`/api/tests/${t!.id}`);
				// Reloaded while waiting or while the mail is being analyzed: keep following the same test (audit I5).
				if (res.ok && (res.data.state === 'waiting' || res.data.state === 'analyzing')) {
					test = t;
					showAddress();
					if (res.data.state === 'analyzing') goWait();
					listen(++generation);
					return;
				}
				// Finished while the page was gone: the result is still there, show it.
				if (res.ok && res.data.state === 'done' && res.data.resultId) {
					storage()?.removeItem(STORE_KEY);
					location.replace(`/ergebnis/${res.data.resultId}`);
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
		pollTimer = 0;
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
			return message('Diese Adresse ist abgelaufen', `Testadressen gelten ${test ? validMinutes(test) : 60} Minuten und nehmen genau eine Mail an. Hol dir einfach eine neue.`);
		}
		if (e.type === 'error') {
			closeStream();
			storage()?.removeItem(STORE_KEY);
			return message('Da ist etwas schiefgelaufen', 'Die Auswertung deiner Mail ist fehlgeschlagen. Starte bitte einen neuen Test.');
		}
		if (e.type === 'done') {
			closeStream();
			preview = e.preview ?? null;
		}
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
		for (const lamp of $$('[data-lamp]')) delete lamp.dataset.status;
		for (const li of $$('[data-step]')) {
			delete li.dataset.status;
			const d = li.querySelector<HTMLElement>('.step-detail')!;
			d.dataset.placeholder ??= d.textContent ?? '';
			d.textContent = d.dataset.placeholder;
		}
		$('[data-fly]').hidden = true;
		$('.wait-slot').dataset.phase = 'before';
		for (const g of $$('[data-glow]')) {
			delete g.dataset.result;
			g.classList.remove('fade');
		}
		stopWaitTicker();
	}

	// ---- waiting: clock and rotating tips ----
	let waitTicker = 0;
	let waitStarted = 0;
	function startWaitTicker() {
		stopWaitTicker();
		if (!test) return;
		waitStarted = Date.now();
		const opened = test.createdAt ? new Date(test.createdAt).getTime() : new Date(test.expiresAt).getTime() - 60 * 60_000;
		const until = new Date(test.expiresAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
		const hint = $('[data-wait-hint]');
		let tip = 0;
		const setHint = (text: string) => {
			if (hint.textContent === text) return;
			if (reduced) return void (hint.textContent = text);
			hint.classList.add('fade');
			setTimeout(() => {
				hint.textContent = text;
				hint.classList.remove('fade');
			}, 400);
		};
		hint.textContent = WAIT_TIPS[0];
		const tick = () => {
			const sec = Math.max(0, Math.floor((Date.now() - opened) / 1000));
			$('[data-wait-clock]').textContent = `Postfach offen seit ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')} · gültig bis ${until} Uhr`;
			const waited = (Date.now() - waitStarted) / 1000;
			if (waited > 45) setHint(WAIT_HELP);
			else if (Math.floor(waited / 7) !== tip) setHint(WAIT_TIPS[(tip = Math.floor(waited / 7)) % WAIT_TIPS.length]);
		};
		tick();
		waitTicker = window.setInterval(tick, 1000);
	}
	function stopWaitTicker() {
		clearInterval(waitTicker);
		waitTicker = 0;
	}

	function goWait() {
		void loadRender();
		if (!$('[data-screen="wait"]').hidden) return;
		show('wait');
		if (!seen.has('received')) startWaitTicker();
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
				markDone(e);
				await sleep(e.step === 'received' ? (reduced ? 200 : 1500) : STEP_MS);
			} else if (e.type === 'done') {
				await finish(e.resultId, gen);
			}
		}
		pumping = false;
	}

	function markDone(e: Extract<ProgressEvent, { type: 'step' }>) {
		const step: StepId = e.step;
		const idx = STEPS.indexOf(step);
		const items = $$('[data-step]');
		items[idx].dataset.state = 'done';
		if (e.status) {
			items[idx].dataset.status = e.status;
			const lamp = root!.querySelector<HTMLElement>(`[data-lamp="${step}"]`);
			if (lamp) lamp.dataset.status = e.status;
		}
		if (e.detail) items[idx].querySelector<HTMLElement>('.step-detail')!.textContent = e.detail;
		if (!reduced && step !== 'received' && 'vibrate' in navigator && matchMedia('(pointer: coarse)').matches) navigator.vibrate?.(8);
		if (items[idx + 1]) items[idx + 1].dataset.state = 'active';
		doneCount = items.filter((li) => li.dataset.state === 'done').length;
		$('[data-prog]').style.setProperty('--p', `${Math.round((doneCount / STEPS.length) * 100)}%`);
		if (step === 'received') {
			stopWaitTicker();
			// Same slot, same height: the waiting info cross-fades into the mail card.
			$('.wait-slot').dataset.phase = 'after';
			$('[data-wait-title]').textContent = 'Mail ist da. Wir prüfen sie';
			announce('Mail empfangen. Die Prüfung läuft.');
			if (e.mail) liveMail = { from: e.mail.from ?? null, subject: e.mail.subject ?? null };
			if (e.mail?.from || e.mail?.subject) {
				$('[data-wm-from]').textContent = e.mail.from ?? 'unbekannt';
				$('[data-wm-subject]').textContent = e.mail.subject ?? '';
				$('[data-wm-subject-row]').hidden = !e.mail.subject;
			}
			$('[data-wait-mail]').classList.toggle('is-empty', !e.mail?.from && !e.mail?.subject);
			// The envelope flies into the ring, lands, then the scan starts.
			$('[data-env-wait]').setAttribute('hidden', '');
			const land = () => {
				$('[data-fly]').hidden = true;
				$('[data-orb]').className = 'orb arrived';
				$('[data-env-got]').removeAttribute('hidden');
				$('[data-scan]').hidden = false;
				if (!reduced && 'vibrate' in navigator && matchMedia('(pointer: coarse)').matches) navigator.vibrate?.([14, 30, 14]);
			};
			if (reduced) land();
			else {
				$('[data-orb]').className = 'orb';
				$('[data-fly]').hidden = false;
				setTimeout(land, 720);
			}
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
		// The glow briefly takes the colour of the result, then fades out over 1.5 s.
		const glow = $('[data-glow]');
		if (res?.ok) glow.dataset.result = res.data.light;
		setTimeout(() => glow.classList.add('fade'), reduced ? 0 : 300);
		await sleep(reduced ? 200 : 1800);
		if (gen !== generation) return;
		if (!res?.ok) return message('Ergebnis nicht gefunden', 'Das Ergebnis konnte nicht geladen werden. Starte bitte einen neuen Test.');
		history.pushState({ resultId }, '', `/ergebnis/${resultId}`);
		renderResult(liveMail ? { ...res.data, mail: { ...res.data.mail, ...liveMail } } : res.data, true);
	}

	const view = createResultView({ $, $$, show, announce, mode, setupUrl: root.dataset.setupUrl, reduced, preview: () => preview, setResult: (r) => (result = r) });
	const { hydrate, selectStation } = view;
	const renderResult = view.render;
	const guide = createGuide({ $, $$, show, result: () => result, reduced });

	// ---- actions ----
	root.addEventListener('click', async (ev) => {
		const t = ev.target as HTMLElement;
		// Opening the mail program counts as "on its way": switch to waiting right after.
		if (t.closest('[data-mailto]') && test) return void setTimeout(goWait, 400);
		const btn = t.closest<HTMLElement>('button, [data-action], [data-fix]');
		if (!btn) return;
		// Links in the result work without JS; with JS they act in place.
		if (btn.tagName === 'A' && (btn.dataset.fix || mode === 'test')) ev.preventDefault();
		const action = btn.dataset.action;
		if (action === 'copy' && test) {
			await copyText(test.address);
			flash(btn, 'Kopiert ✓');
		} else if (action === 'sent') {
			goWait();
		} else if (action === 'reset' || action === 'retest') {
			if (mode === 'result') return void (location.href = '/');
			storage()?.removeItem(STORE_KEY);
			history.pushState({}, '', '/');
			await newTest();
			window.scrollTo({ top: 0 });
			$<HTMLButtonElement>('.copy-address').focus({ preventScroll: true });
		} else if (action === 'source') {
			const panel = $('#rv-source');
			const open = panel.hidden;
			panel.hidden = !open;
			btn.setAttribute('aria-expanded', String(open));
			if (open) panel.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
		} else if (btn.dataset.src) {
			for (const tab of $$('[data-src]')) tab.setAttribute('aria-selected', String(tab === btn));
			for (const p of $$('[data-src-panel]')) p.hidden = p.dataset.srcPanel !== btn.dataset.src;
		} else if (btn.dataset.station !== undefined) {
			selectStation(Number(btn.dataset.station));
		} else if (btn.dataset.goto !== undefined) {
			selectStation(Number(btn.dataset.goto), true);
			$('.rv-route').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
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
			guide.open(btn.dataset.fix as GuideTopic);
		} else if (btn.dataset.provider) {
			guide.pick(btn.dataset.provider);
		} else if (btn.dataset.copy !== undefined) {
			await copyText(btn.dataset.copy);
			flash(btn, 'Kopiert');
		}
	});

	// Stations are a tablist: arrow keys, Home and End move between them (WAI-ARIA tabs).
	root.addEventListener('keydown', (ev) => {
		const tab = (ev.target as HTMLElement).closest<HTMLElement>('.rv-st');
		if (!tab) return;
		const i = Number(tab.dataset.station);
		const n = $$('.rv-st').length;
		const next = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: n - 1 }[ev.key];
		if (next === undefined) return;
		ev.preventDefault();
		selectStation((next + n) % n, true);
	});

	window.addEventListener('popstate', () => {
		if (location.pathname === '/' && mode === 'test') newTest();
	});

	// ---- boot ----
	if (mode === 'result') {
		// Caddy has already rendered the result into the page (or "not found"): keep that markup (no layout shift)
		// and only add behaviour. The API answer is still needed for the provider guides.
		const ssr = !!root.querySelector('[data-rv]');
		if (root.querySelector('[data-rv-missing]')) return void import('./hairline').then((m) => m.initHairline(root));
		if (ssr) {
			show('result');
			hydrate(null, true);
		}
		const id = location.pathname.split('/').filter(Boolean)[1] ?? '';
		api<MailResult & { message?: string }>(`/api/results/${encodeURIComponent(id)}`)
			.then((res) => {
				if (res.ok && ssr) result = res.data;
				else if (res.ok) renderResult(res.data);
				else if (!ssr) message('Ergebnis nicht gefunden', 'Ergebnisse werden nach 7 Tagen automatisch gelöscht. Mach einfach einen neuen Test.');
			})
			.catch(() => (ssr ? undefined : message('Gerade geht es nicht', 'Der Server ist nicht erreichbar. Probier es gleich noch einmal.')));
	} else {
		// A test address costs rate limit and keeps a stream open: only create it for a page someone looks at,
		// and close the stream while the tab is in the background (audit I9). On return it replays what happened.
		let paused = false;
		const start = () => {
			resetAnimation();
			resumeOrCreate();
		};
		if (document.visibilityState === 'visible') start();
		else {
			const once = () => {
				if (document.visibilityState !== 'visible') return;
				document.removeEventListener('visibilitychange', once);
				start();
			};
			document.addEventListener('visibilitychange', once);
		}
		const pause = () => {
			if (!test || result || (!source && !pollTimer)) return;
			closeStream();
			paused = true;
		};
		const resume = () => {
			if (!paused || !test || result) return;
			paused = false;
			listen(generation);
		};
		document.addEventListener('visibilitychange', () => (document.hidden ? pause() : resume()));
		window.addEventListener('pagehide', pause);
		window.addEventListener('pageshow', (e) => e.persisted && resume());
	}
}
