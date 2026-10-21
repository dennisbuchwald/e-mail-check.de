// Scrollytelling for "Der Weg deiner Mail" (components/MailRoute.astro).
// The scene loads when the section comes near. While the section is on screen, one rAF per scroll turns the
// position of the reading line inside the step list into progress 0..1 for the scene. The dimming of inactive
// steps runs on a CSS view timeline; browsers without one get is-steps/is-active classes from here instead.
// Reduced motion: no scroll link, the scene shows its end state (all stations green).
type Scene = { update(o: { progress?: number; play?: boolean }): void };

export function initMailRoute(): void {
	const sec = document.querySelector<HTMLElement>('[data-route-sec]');
	const box = sec?.querySelector<HTMLElement>('[data-mailroute]');
	const list = sec?.querySelector<HTMLElement>('[data-route-list]');
	if (!sec || !box || !list || !('IntersectionObserver' in window)) return;
	const steps = [...list.querySelectorAll<HTMLElement>('[data-step]')];
	const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
	const timeline = CSS.supports('animation-timeline: view()');
	const stacked = matchMedia('(max-width: 1080px)');
	if (reduced) sec.classList.add('is-static');

	let scene: Scene | null = null;
	let loading: Promise<void> | null = null;
	const load = () =>
		(loading ??= import('./mailroute').then(({ mailroute }) => {
			scene = mailroute(box, { progress: reduced ? 1 : progress(), theme: 'light', label: box.dataset.label });
		}));

	// The reading line: the middle of the viewport, or on phones the middle of what the sticky scene leaves free.
	// Step i centred on it = progress i / 5 = the envelope at station i (docs/redesign/hairline/mailroute.js).
	function progress(): number {
		const mid = (el: HTMLElement) => { const r = el.getBoundingClientRect(); return r.top + r.height / 2; };
		const top = stacked.matches ? box!.getBoundingClientRect().bottom : 0;
		const line = top + (innerHeight - top) / 2;
		const first = mid(steps[0]), last = mid(steps[steps.length - 1]);
		return Math.min(1, Math.max(0, (line - first) / (last - first)));
	}

	let frame = 0;
	let active = -1;
	const tick = () => {
		frame = 0;
		const p = progress();
		scene?.update({ progress: p });
		if (!timeline) {
			const i = Math.round(p * (steps.length - 1));
			if (i !== active) {
				steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
				active = i;
			}
		}
	};
	const onScroll = () => {
		if (!frame) frame = requestAnimationFrame(tick);
	};

	new IntersectionObserver(
		(entries) => {
			if (entries.some((e) => e.isIntersecting)) load();
		},
		{ rootMargin: '600px 0px' },
	).observe(sec);
	if (reduced) return;
	new IntersectionObserver((entries) => {
		const on = entries.some((e) => e.isIntersecting);
		if (on) {
			addEventListener('scroll', onScroll, { passive: true });
			addEventListener('resize', onScroll, { passive: true });
			if (!timeline) sec.classList.add('is-steps');
			onScroll();
		} else {
			removeEventListener('scroll', onScroll);
			removeEventListener('resize', onScroll);
		}
	}).observe(list);
}
