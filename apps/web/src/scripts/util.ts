export function esc(s: string): string {
	return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Minimal inline markdown for guide steps: **bold** and `code`, after escaping. */
export function inline(s: string): string {
	return esc(s)
		.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
		.replace(/`([^`]+)`/g, '<code class="mono">$1</code>');
}

export async function copyText(text: string): Promise<void> {
	try {
		await navigator.clipboard.writeText(text);
	} catch {
		const ta = document.createElement('textarea');
		ta.value = text;
		ta.setAttribute('readonly', '');
		ta.style.position = 'fixed';
		ta.style.opacity = '0';
		document.body.appendChild(ta);
		ta.select();
		document.execCommand('copy');
		ta.remove();
	}
}

/** Temporarily replaces a button label, e.g. "Kopiert". */
export function flash(btn: HTMLElement, label: string, ms = 1800): void {
	const original = btn.dataset.label ?? btn.textContent ?? '';
	btn.dataset.label = original;
	btn.textContent = label;
	clearTimeout(Number(btn.dataset.timer));
	btn.dataset.timer = String(window.setTimeout(() => (btn.textContent = original), ms));
}
