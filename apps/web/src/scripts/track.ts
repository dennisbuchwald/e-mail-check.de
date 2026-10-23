// Statistics (Umami, self-hosted). layouts/Base.astro loads it with auto-track off, so every
// page view and event goes through here and leaves with a cleaned URL.
type UmamiPayload = { url: string; referrer?: string; name?: string; data?: Record<string, string | number> };
type Umami = { track: (fn: (p: UmamiPayload) => UmamiPayload) => void };
const umami = () => (window as unknown as { umami?: Umami }).umami;

/** Path without secrets: result links become /ergebnis, query keeps only utm_* (no checked domains). */
export function cleanUrl(url: string): string {
	const u = new URL(url, location.origin);
	const path = u.pathname.replace(/^\/ergebnis\/[^/]+/, '/ergebnis');
	const keep = [...u.searchParams].filter(([k]) => k.startsWith('utm_'));
	return path + (keep.length ? `?${new URLSearchParams(keep)}` : '');
}

/** Counts a page view (no name) or a named event. Never pass addresses, domains or mail contents. */
export function track(name?: string, data?: Record<string, string | number>): void {
	const send = () => {
		try {
			umami()?.track((p) => ({ ...p, url: cleanUrl(p.url), ...(name ? { name, ...(data ? { data } : {}) } : {}) }));
		} catch {
			/* statistics must never break the page */
		}
	};
	if (umami()) send();
	else window.addEventListener('load', send, { once: true });
}
