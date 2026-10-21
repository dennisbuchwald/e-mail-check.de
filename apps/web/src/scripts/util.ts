// One escape function for the server-rendered and the browser-rendered markup.
import { COPY, esc } from '@emc/shared';
export { esc };

/** A value with a copy button (DNS records in the guide and the result). */
export const copyRow = (value: string, label = 'Kopieren') =>
	`<div class="copyrow"><span class="mono">${esc(value)}</span><button type="button" class="copybtn" data-copy="${esc(value)}">${COPY}<span>${label}</span></button></div>`;

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
	// Buttons with an icon keep it: only the label <span> changes.
	const target = btn.querySelector<HTMLElement>('span:last-child') ?? btn;
	const original = target.dataset.label ?? target.textContent ?? '';
	target.dataset.label = original;
	target.textContent = label;
	clearTimeout(Number(target.dataset.timer));
	target.dataset.timer = String(window.setTimeout(() => (target.textContent = original), ms));
}
