// Behaviour of the result markup (packages/shared/src/result-view.ts, the same markup the server renders):
// score count-up, station tabs, mail source panel, and rendering a live result in the browser.
import { BANDS, fmt1 as fmt, type MailPreview, type MailResult } from '@emc/shared';

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

	function selectStation(i: number, focus = false) {
		const tabs = $$('.rv-st');
		if (!tabs[i]) return;
		tabs.forEach((t, j) => {
			t.setAttribute('aria-selected', String(j === i));
			t.tabIndex = j === i ? 0 : -1;
		});
		for (const p of $$('[data-panel]')) {
			const on = Number(p.dataset.panel) === i;
			if (on && !p.hasAttribute('data-open')) {
				// Restart the swap animation on the newly opened panel.
				p.classList.remove('rv-swap');
				void p.offsetWidth;
				p.classList.add('rv-swap');
			}
			p.toggleAttribute('data-open', on);
		}
		if (focus) tabs[i].focus();
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
		selectStation(Number(rv.dataset.open ?? 0));
		fillPreview();
		if (r) ctx.setResult(r);
	}

	async function render(r: MailResult, live = false) {
		const { renderResultView, resultStyles } = await loadRender();
		if (ctx.mode === 'test') await resultStyles();
		ctx.setResult(r);
		$('[data-result-view]').innerHTML = renderResultView(r, { shareUrl: `${location.origin}/ergebnis/${r.id}`, setupUrl: ctx.setupUrl });
		hydrate(r, true);
		ctx.show('result');
		window.scrollTo({ top: 0 });
		const v = r.verdict ?? { line1: r.headline, line2: '' };
		ctx.announce(`Ergebnis: ${fmt(r.score)} von 10, ${BANDS[r.band].label}. ${v.line1} ${v.line2}`);
		$('[data-headline]').focus({ preventScroll: true });
		// Only right after a live test: browsers block vibration before the first tap anyway.
		if (live && !reduced && 'vibrate' in navigator && matchMedia('(pointer: coarse)').matches) navigator.vibrate?.([12, 40, 18]);
	}

	return { hydrate, render, selectStation };
}
