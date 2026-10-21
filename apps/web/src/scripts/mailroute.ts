// "Der Weg deiner Mail" as one hairline scene (apps/web/scenes/mailroute.js, built by scripts/build-mailroute.mjs).
// Same shape as the package's figures: mailroute(el, { progress, play, theme, label }) → { update, destroy }.
// progress 0..1 moves the envelope; play loops it on its own (wait mode, phones); reduced motion shows the end state.
import { HL, spec } from './mailroute.gen.js';

export type MailrouteOptions = { progress?: number; play?: boolean; theme?: 'auto' | 'light' | 'dark'; label?: string };
export type Mailroute = { update(o: MailrouteOptions): void; destroy(): void };

const LAP_S = 7;
const VIEWBOX = '0 35 400 250';

export function mailroute(el: HTMLElement, options: MailrouteOptions = {}): Mailroute {
	const opts = { ...options };
	const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
	HL.inject(el.getRootNode().nodeType === 11 ? el.getRootNode() : document);
	el.setAttribute('data-hairline', 'mailroute');
	el.setAttribute('role', 'img');
	const dress = () => {
		el.setAttribute('aria-label', opts.label ?? 'Illustration: der Weg einer Mail vom Absender bis ins Postfach');
		if (opts.theme === 'light' || opts.theme === 'dark') el.setAttribute('data-hairline-theme', opts.theme);
		else el.removeAttribute('data-hairline-theme');
	};
	dress();
	// Weak devices get the travel and the checks without the small moments (scene reads data-lite).
	if ((navigator.hardwareConcurrency ?? 8) <= 4) el.dataset.lite = '1';
	// The scene is wider than the package's 5:4 frame: crop the viewBox to it (8:5).
	const svg = HL.mk('svg', { viewBox: VIEWBOX, 'aria-hidden': 'true' }, el);
	let text = 'rest';
	const read = { get textContent() { return text; }, set textContent(v: string) { text = v ?? ''; } };
	const at = () => (reduced ? 1 : Math.min(1, Math.max(0, opts.progress ?? 0)));
	const engine = spec.mount({ stage: el, svg, read }, at());

	// play: the envelope runs the route in a loop, on the kernel's one frame loop (sleeps offscreen).
	let lap = 0;
	const loop = HL.register(el, (dt: number) => {
		if (!opts.play || reduced) return false;
		lap = (lap + dt / LAP_S) % 1.15;
		engine.set(Math.min(1, lap));
		return true;
	});
	const apply = () => {
		if (!opts.play || reduced) engine.set(at());
		else loop.wake();
	};
	apply();

	let dead = false;
	return {
		update(next) {
			if (dead) return;
			Object.assign(opts, next);
			dress();
			apply();
		},
		destroy() {
			if (dead) return;
			dead = true;
			loop.unregister();
			engine.destroy();
			svg.remove();
			for (const a of ['data-hairline', 'role', 'aria-label', 'data-hairline-theme', 'data-lite']) el.removeAttribute(a);
		},
	};
}
