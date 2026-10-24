// Behaviour of the result markup (packages/shared/src/result-view.ts, the same markup the server renders):
// score count-up, the compact scene with station details, the DNS re-check of the steps, the mail source panel,
// and rendering a live result in the browser.
import { BANDS, fmt1 as fmt, type MailPreview, type MailResult } from '@emc/shared';
import type { Mailroute, SceneState } from './mailroute';
import { track } from './track';

let render_: Promise<typeof import('./result-render')> | null = null;
/** The renderer and its styles, loaded on demand (preloaded as soon as a test is under way). */
export const loadRender = () => (render_ ??= import('./result-render'));

export interface ResultContext {
	$: <T extends Element = HTMLElement>(sel: string) => T;
	$$: (sel: string) => HTMLElement[];
	show: (screen: 'result') => void;
	announce: (text: string) => void;
	mode: 'test' | 'result';
	setupUrl: string | undefined;
	reduced: boolean;
	/** The mail itself from the live done event. Only in this page's memory, never stored. */
	preview: () => MailPreview | null;
	setResult: (r: MailResult) => void;
}

export function createResultView(ctx: ResultContext) {
	const { $, $$, reduced } = ctx;
	let scene: Mailroute | null = null;

	/** Calm count-up (2.4 s, ease-out); the width is reserved for "10,0", so nothing next to it moves. */
	const COUNT_MS = 2400;
	function countUp(el: HTMLElement, to: number) {
		if (reduced) return void (el.textContent = fmt(to));
		el.textContent = fmt(0);
		const start = performance.now();
		const tick = (now: number) => {
			const t = Math.min(1, (now - start) / COUNT_MS);
			const eased = 1 - Math.pow(1 - t, 3);
			el.textContent = fmt(Math.round(to * eased * 10) / 10);
			if (t < 1) requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);
	}

	/** Opens the detail of station i below the scene (a second click closes it). */
	function selectStation(i: number, focus = false) {
		const panel = $$('[data-panel]').find((p) => Number(p.dataset.panel) === i);
		if (!panel) return;
		const open = panel.hidden === true;
		for (const p of $$('[data-panel]')) p.hidden = p !== panel || !open;
		for (const b of $$('.rv-hot')) {
			const on = Number(b.dataset.station) === i && open;
			b.setAttribute('aria-expanded', String(on));
			b.classList.toggle('is-open', on);
		}
		if (open && !reduced) {
			panel.classList.remove('rv-swap');
			void panel.offsetWidth;
			panel.classList.add('rv-swap');
		}
		if (open && focus) panel.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
	}

	function fillPreview() {
		const view = $('[data-result-view]');
		const preview = ctx.preview();
		if (!preview) return;
		for (const m of view.querySelectorAll<HTMLElement>('[data-preview-missing]')) m.hidden = true;
		const text = view.querySelector<HTMLElement>('[data-preview-text]');
		if (text) {
			text.textContent = preview.text ?? '(Die Mail hat keine Textfassung.)';
			text.hidden = false;
		}
		const headers = view.querySelector<HTMLElement>('[data-preview-headers]');
		if (headers) {
			headers.textContent = preview.headers + (preview.truncated ? '\n\n(gekürzt)' : '');
			headers.hidden = false;
		}
		const frame = view.querySelector<HTMLIFrameElement>('[data-preview-html]');
		if (frame) {
			// sandbox="" blocks scripts and forms; the CSP inside blocks every external load (images, fonts, tracking pixels).
			const csp = '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:">';
			frame.srcdoc = preview.html ? csp + preview.html : `${csp}<p style="font:14px system-ui;color:#555">Die Mail hat keine HTML-Fassung.</p>`;
			frame.hidden = false;
		}
	}

	/** Behaviour for the result markup, whether the browser or the server rendered it. */
	function hydrate(r: MailResult | null, animate: boolean) {
		const view = $('[data-result-view]');
		const rv = view.querySelector<HTMLElement>('[data-rv]');
		if (!rv) return;
		rv.dataset.js = '';
		if (animate && !reduced) rv.classList.add('rv-anim');
		const value = rv.querySelector<HTMLElement>('[data-score-value]');
		if (value && animate) countUp(value, Number(rv.dataset.final));
		fillPreview();
		if (r) ctx.setResult(r);
		void initScene(rv);
	}

	/**
	 * The compact scene replays this one mail once (about 3 s, apps/web/scenes/mailroute.js); every station shows
	 * how its check went. Buttons over the station markers open the details below.
	 */
	let states: SceneState[] = [];
	async function initScene(rv: HTMLElement) {
		const box = rv.querySelector<HTMLElement>('[data-rv-scene]');
		if (!box) return;
		scene?.destroy();
		states = (box.dataset.states ?? '').split(',') as SceneState[];
		const details = JSON.parse(box.dataset.details || '{}') as Record<string, unknown>;
		const { mailroute } = await import('./mailroute');
		scene = mailroute(box, { mode: 'replay', duration: 3, states, details, label: box.dataset.label, theme: 'light', onSelect: (i) => selectStation(i, true) });
		placeHots(rv);
	}

	/** The station buttons sit on the markers of the drawing (percent of the scene box). */
	function placeHots(rv: HTMLElement) {
		const at = scene?.anchors() ?? [];
		rv.querySelectorAll<HTMLElement>('.rv-hot').forEach((b, i) => {
			const a = at[i];
			if (!a) return;
			b.style.left = `${(a[0] * 100).toFixed(2)}%`;
			b.style.top = `${(a[1] * 100).toFixed(2)}%`;
		});
		rv.classList.add('has-scene');
	}

	/**
	 * "Eingetragen? Jetzt prüfen": asks our resolver for the record again (no new mail, rate-limited by the API).
	 * Found: the card turns green, the score counts up to a provisional value, the station in the scene turns green.
	 */
	const RETRY_MS = 60_000;
	async function recheck(card: HTMLElement) {
		const spec = JSON.parse(card.dataset.recheck ?? '{}') as { kind: 'spf' | 'dmarc' | 'dkim'; domain: string; selector?: string; expect?: string; policies?: string[] };
		const status = card.querySelector<HTMLElement>('[data-todo-status]')!;
		const btn = card.querySelector<HTMLButtonElement>('[data-action="recheck"]');
		clearTimeout(Number(card.dataset.retry ?? 0));
		if (btn) btn.disabled = true;
		status.textContent = 'Prüfe …';
		const params = new URLSearchParams({ domain: spec.domain });
		if (spec.selector) params.set('selector', spec.selector);
		const res = await fetch(`/api/dns?${params}`, { headers: { Accept: 'application/json' } }).catch(() => null);
		const data = (await res?.json().catch(() => null)) as { findings?: { id: string; status: string; raw?: Record<string, unknown> }[]; message?: string } | null;
		if (btn) btn.disabled = false;
		if (!res?.ok || !data?.findings) {
			status.textContent = data?.message ?? 'Die Prüfung ging gerade nicht. Probier es gleich noch einmal.';
			return;
		}
		const f = data.findings.find((x) => x.id === spec.kind);
		const raw = (f?.raw ?? {}) as { record?: string; policy?: string };
		const ok =
			spec.kind === 'spf' ? f?.status === 'ok' && (!spec.expect || String(raw.record ?? '').split(/\s+/).includes(spec.expect)) : spec.kind === 'dmarc' ? !!raw.policy && (spec.policies ?? []).includes(String(raw.policy)) : f?.status === 'ok';
		track('Jetzt prüfen', { ergebnis: ok ? 'jetzt grün' : 'noch nicht sichtbar' });
		if (!ok) {
			status.textContent = 'Noch nicht sichtbar. DNS braucht manchmal ein paar Minuten. Wir prüfen in einer Minute noch einmal.';
			card.dataset.retry = String(window.setTimeout(() => recheck(card), RETRY_MS));
			return;
		}
		done(card);
	}

	function done(card: HTMLElement) {
		if (card.classList.contains('is-done')) return;
		card.classList.add('is-done');
		card.querySelector<HTMLElement>('[data-todo-status]')!.textContent = 'Gefunden. Der Eintrag ist jetzt im DNS.';
		card.querySelector('[data-action="recheck"]')?.remove();
		// Provisional score: the points of every done card on top of the measured one.
		const rv = card.closest<HTMLElement>('[data-rv]')!;
		const base = Number(rv.dataset.final);
		const gained = [...rv.querySelectorAll<HTMLElement>('[data-todo].is-done')].reduce((s, c) => s + Number(c.dataset.gain || 0), 0);
		const value = rv.querySelector<HTMLElement>('[data-score-value]');
		if (value) countTo(value, Number(value.textContent?.replace(',', '.')) || base, Math.min(10, Math.round((base + gained) * 10) / 10));
		rv.querySelector<HTMLElement>('[data-provisional]')!.hidden = false;
		// The station turns green once none of its steps is open any more.
		const st = Number(card.dataset.station);
		if (![...rv.querySelectorAll<HTMLElement>(`[data-todo][data-station="${st}"]`)].some((c) => !c.classList.contains('is-done'))) {
			states[st] = 'ok';
			scene?.update({ states: [...states] });
		}
	}

	function countTo(el: HTMLElement, from: number, to: number) {
		if (reduced) return void (el.textContent = fmt(to));
		const start = performance.now();
		const tick = (now: number) => {
			const t = Math.min(1, (now - start) / 900);
			el.textContent = fmt(Math.round((from + (to - from) * (1 - Math.pow(1 - t, 3))) * 10) / 10);
			if (t < 1) requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);
	}

	async function render(r: MailResult, live = false) {
		const { renderResultView, resultStyles } = await loadRender();
		if (ctx.mode === 'test') await resultStyles();
		ctx.setResult(r);
		// The dbw media offer only for the person who just ran the test, never on the shared link.
		$('[data-result-view]').innerHTML = renderResultView(r, { shareUrl: `${location.origin}/ergebnis/${r.id}`, ...(live ? { setupUrl: ctx.setupUrl } : {}) });
		hydrate(r, true);
		ctx.show('result');
		window.scrollTo({ top: 0 });
		const v = r.verdict ?? { line1: r.headline, line2: '' };
		ctx.announce(`Ergebnis: ${fmt(r.score)} von 10, ${BANDS[r.band].label}. ${v.line1} ${v.line2}`);
		$('[data-headline]').focus({ preventScroll: true });
		// Only right after a live test: browsers block vibration before the first tap anyway.
		if (live && !reduced && 'vibrate' in navigator && matchMedia('(pointer: coarse)').matches) navigator.vibrate?.([12, 40, 18]);
	}

	/** Runs the envelope along the route of this mail again (button "Neu abspielen"). */
	const replay = () => scene?.replay();

	return { hydrate, render, selectStation, recheck, replay };
}
