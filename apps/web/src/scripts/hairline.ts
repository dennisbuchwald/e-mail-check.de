// Line figures (hairline, MIT, Lucas Marques). Loaded only when an element with [data-hairline] comes near,
// via dynamic import, so pages without figures and the first paint never pay for them.
// Phones have no pointer: a figure plays once for a few seconds when half of it is visible, then rests.
// Under prefers-reduced-motion the library keeps figures still and we never ask them to play.

type Figure = { update(o: { play?: boolean }): void; destroy(): void };
type Make = (el: HTMLElement, o: { theme: 'light'; label?: string; intensity?: number; play?: boolean }) => Figure;

const PLAY_MS = 3500;

export function initHairline(root: ParentNode = document): void {
	const boxes = [...root.querySelectorAll<HTMLElement>('[data-hairline]')];
	if (!boxes.length || !('IntersectionObserver' in window)) return;
	const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
	const touch = matchMedia('(hover: none)').matches;
	let lib: Promise<Record<string, Make>> | null = null;
	const load = () => (lib ??= import('./hairline-figures') as unknown as Promise<Record<string, Make>>);

	// Path between the cards fills once the section is in view.
	const sec = root.querySelector<HTMLElement>('[data-route-sec]');
	if (sec) {
		const once = new IntersectionObserver((entries) => {
			if (entries.some((e) => e.isIntersecting)) {
				sec.classList.add('is-seen');
				once.disconnect();
			}
		}, { threshold: 0.25 });
		once.observe(sec);
	}

	// One figure per element, created exactly once (two observer entries can arrive before the module has loaded).
	const figures = new Map<HTMLElement, Promise<Figure | null>>();
	const figureFor = (el: HTMLElement) => {
		let f = figures.get(el);
		if (!f) {
			f = load().then((mod) => {
				const make = mod[el.dataset.hairline ?? ''];
				return make ? make(el, { theme: 'light', label: el.dataset.label, intensity: 0.5 }) : null;
			});
			figures.set(el, f);
		}
		return f;
	};
	const played = new Set<HTMLElement>();
	const io = new IntersectionObserver(
		(entries) => {
			for (const e of entries) {
				const el = e.target as HTMLElement;
				if (!e.isIntersecting) continue;
				const playNow = touch && !reduced && e.intersectionRatio >= 0.5 && !played.has(el);
				if (playNow) played.add(el);
				figureFor(el).then((fig) => {
					if (!fig || !playNow) return;
					fig.update({ play: true });
					setTimeout(() => fig.update({ play: false }), PLAY_MS);
				});
			}
		},
		{ rootMargin: '200px 0px', threshold: [0, 0.5] },
	);
	for (const b of boxes) io.observe(b);
}
