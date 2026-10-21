// Status bar: real all-time "mails checked" number (from 100 on, else "Kostenlos · ohne Konto"), Ratgeber menu, compact fallback without scroll timelines.
const bar = document.querySelector<HTMLElement>('[data-statusbar]')!;
// The server caches for 60 s; the browser does too, so page views do not each hit the API.
const showCount = (n: unknown) => {
	if (typeof n === 'number') bar.querySelector('[data-checked]')!.textContent = ` · ${n.toLocaleString('de-DE')} Mails geprüft`;
};
let cached: { at: number; n: number | null } | null = null;
try {
	cached = JSON.parse(sessionStorage.getItem('emc-checked') ?? 'null');
} catch {
	/* storage blocked */
}
if (cached && Date.now() - cached.at < 60_000) showCount(cached.n);
else
	fetch('/api/stats', { headers: { Accept: 'application/json' } })
		.then((r) => (r.ok ? r.json() : null))
		.then((d: { mailsChecked?: number | null } | null) => {
			showCount(d?.mailsChecked);
			try {
				sessionStorage.setItem('emc-checked', JSON.stringify({ at: Date.now(), n: d?.mailsChecked ?? null }));
			} catch {
				/* storage blocked */
			}
		})
		.catch(() => {});

const menu = bar.querySelector<HTMLElement>('[data-menu]')!;
const button = menu.querySelector<HTMLButtonElement>('[data-menu-button]')!;
const panel = menu.querySelector<HTMLElement>('[data-menu-panel]')!;
const setOpen = (open: boolean, focusButton = false) => {
	button.setAttribute('aria-expanded', String(open));
	panel.hidden = !open;
	if (open) panel.querySelector<HTMLElement>('a')?.focus();
	else if (focusButton) button.focus();
};
button.addEventListener('click', () => setOpen(panel.hidden === true));
menu.addEventListener('keydown', (e) => {
	if (e.key === 'Escape' && !panel.hidden) setOpen(false, true);
	if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !panel.hidden) {
		e.preventDefault();
		const links = [...panel.querySelectorAll<HTMLElement>('a')];
		const i = links.indexOf(document.activeElement as HTMLElement);
		links[(i + (e.key === 'ArrowDown' ? 1 : links.length - 1)) % links.length]?.focus();
	}
});
menu.addEventListener('focusout', (e) => {
	if (!menu.contains(e.relatedTarget as Node)) setOpen(false);
});
document.addEventListener('click', (e) => {
	if (!menu.contains(e.target as Node)) setOpen(false);
});

// Browsers without scroll-driven animations (and reduced motion) switch with a class.
const scrollTimeline = CSS.supports('animation-timeline: scroll()');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!scrollTimeline || reduced) {
	let raf = 0;
	const update = () => {
		raf = 0;
		bar.classList.toggle('is-compact', window.scrollY > 80);
	};
	window.addEventListener('scroll', () => (raf ||= requestAnimationFrame(update)), { passive: true });
	update();
}
