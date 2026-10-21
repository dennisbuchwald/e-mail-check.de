// "Der Weg deiner Mail" as one hairline scene (apps/web/scenes/mailroute.js, built by scripts/build-mailroute.mjs).
// Same shape as the package's figures: mailroute(el, options) → { update, replay, focus, destroy }.
// mode "scroll" (start page): progress 0..1 comes from outside, play loops it.
// mode "replay" (result): the envelope runs the route of one mail once, with the states of its stations,
// then onDone fires. Reduced motion shows the end state at once.
import { HL, spec } from './mailroute.gen.js';

export type SceneState = 'ok' | 'warn' | 'bad' | 'skip';
export type MailrouteOptions = {
	progress?: number;
	play?: boolean;
	theme?: 'auto' | 'light' | 'dark';
	label?: string;
	mode?: 'scroll' | 'replay';
	states?: SceneState[];
	details?: Record<string, unknown>;
	/** Extra scale when focusing a station (0.15 = 1.15×). */
	zoom?: number;
	onSelect?: (station: number) => void;
	onDone?: () => void;
};
export type Mailroute = { update(o: MailrouteOptions): void; replay(): void; focus(station: number | null): void; destroy(): void };

const LAP_S = 7;
const REPLAY_S = 4.6;
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
	const replayMode = opts.mode === 'replay';
	const at = () => (reduced ? 1 : Math.min(1, Math.max(0, opts.progress ?? 0)));
	const engine = spec.mount({ stage: el, svg, read }, replayMode ? (reduced ? 1 : 0) : at());
	const configure = () => engine.configure({ ...(opts.states ? { states: opts.states } : {}), details: opts.details ?? {}, zoom: opts.zoom, onSelect: opts.onSelect });
	configure();

	// play (scroll mode) loops the route; replay runs it once. Both on the kernel's one frame loop (sleeps offscreen).
	let lap = 0;
	let replaying = false;
	let t = 0;
	const finish = () => {
		replaying = false;
		engine.jump(1);
		opts.onDone?.();
	};
	const loop = HL.register(el, (dt: number) => {
		if (replaying) {
			t += dt / REPLAY_S;
			if (t >= 1) {
				finish();
				return false;
			}
			engine.jump(t);
			return true;
		}
		if (!opts.play || reduced || replayMode) return false;
		lap = (lap + dt / LAP_S) % 1.15;
		engine.set(Math.min(1, lap));
		return true;
	});
	const replay = () => {
		engine.focus(null);
		if (reduced) return finish();
		t = 0;
		engine.jump(0);
		replaying = true;
		loop.wake();
	};
	const apply = () => {
		if (replayMode) return;
		if (!opts.play || reduced) engine.set(at());
		else loop.wake();
	};
	apply();
	if (replayMode) replay();

	let dead = false;
	return {
		update(next) {
			if (dead) return;
			Object.assign(opts, next);
			dress();
			configure();
			apply();
		},
		replay,
		focus: (i) => engine.focus(i),
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
