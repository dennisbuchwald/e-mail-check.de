// Mail test UI: drives the screens in Tool.astro from real API events (SSE, polling fallback).
import type { Finding, GuideTopic, MailResult, ProgressEvent, StepId, TestStatus } from '@emc/shared';
import { STEPS } from '@emc/shared';
import { copyText, esc, flash, inline } from './util';

type Screen = 'start' | 'wait' | 'result' | 'guide' | 'msg';

interface GuideStep {
	text: string;
	eintrag?: { typ: string; host: string; wert: string };
}
interface GuideData {
	[provider: string]: { name: string; url: Partial<Record<GuideTopic, string>>; schritte: Partial<Record<GuideTopic, GuideStep[]>> };
}

const STORE_KEY = 'emc-test';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Each check stays visible at least this long, so the animation stays readable when analysis is fast. */
const STEP_MS = reduced ? 120 : 560;

const TOPIC_TITLES: Record<GuideTopic, { title: string; lead: string }> = {
	spf: { title: 'Absender bestätigen', lead: 'Dauert etwa 5 Minuten. Fachbegriff: SPF-Eintrag.' },
	dkim: { title: 'Unterschrift einrichten', lead: 'Dauert etwa 10 Minuten. Fachbegriff: DKIM.' },
	dmarc: { title: 'Schutzregel einrichten', lead: 'Dauert etwa 3 Minuten. Fachbegriff: DMARC-Eintrag.' },
};

/** Generic steps for providers we have no guide for yet. */
const GENERIC: Record<GuideTopic, GuideStep[]> = {
	spf: [
		{ text: 'Melde dich bei dem Anbieter an, bei dem deine **Domain** liegt, und öffne die **DNS-Einstellungen**.' },
		{ text: 'Suche einen **TXT-Eintrag**, der mit `v=spf1` beginnt. Es darf nur einen davon geben.' },
		{ text: 'Trag dort alle Dienste ein, die Mails für dich senden. Den passenden Baustein (`include:…`) nennt dir jeder Dienst in seiner Hilfe.' },
		{ text: 'Speichern, ein paar Minuten warten und erneut testen.' },
	],
	dkim: [
		{ text: 'Öffne bei dem Dienst, der deine Mails **verschickt** (Postfach-Anbieter oder Newsletter-Tool), die Einstellungen zu **DKIM** oder **Domain-Authentifizierung**.' },
		{ text: 'Der Dienst zeigt dir einen oder zwei Einträge (TXT oder CNAME). Kopier Name und Wert.' },
		{ text: 'Leg diese Einträge in den **DNS-Einstellungen** deiner Domain an.' },
		{ text: 'Aktiviere DKIM danach beim Versand-Dienst und teste erneut.' },
	],
	dmarc: [
		{ text: 'Öffne die **DNS-Einstellungen** deiner Domain.' },
		{ text: 'Leg einen neuen **TXT-Eintrag** an. Als Name (Host) trägst du `_dmarc` ein.', eintrag: { typ: 'TXT', host: '_dmarc', wert: 'v=DMARC1; p=none; rua=mailto:dmarc@{domain}' } },
		{ text: 'Speichern. Nach ein paar Wochen ohne Probleme stellst du `p=none` auf `p=quarantine` um.' },
	],
};

/** Guess the provider from the SPF record, to preselect the right guide. */
function guessProvider(result: MailResult): string | null {
	const spf = result.findings.find((f) => f.id === 'spf');
	const rec = String(spf?.raw?.record ?? '').toLowerCase();
	if (rec.includes('spf.protection.outlook.com')) return 'microsoft-365';
	if (rec.includes('_spf.google.com')) return 'google-workspace';
	if (rec.includes('ionos') || rec.includes('kundenserver.de')) return 'ionos';
	if (rec.includes('strato')) return 'strato';
	if (rec.includes('kasserver.com') || rec.includes('all-inkl')) return 'all-inkl';
	if (rec.includes('your-server.de') || rec.includes('hetzner')) return 'hetzner';
	return null;
}

async function api<T>(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T }> {
	const res = await fetch(path, { ...init, headers: { Accept: 'application/json' } });
	const data = (await res.json().catch(() => ({}))) as T;
	return { ok: res.ok, status: res.status, data };
}

function storage(): Storage | null {
	try {
		return sessionStorage;
	} catch {
		return null;
	}
}

export function initTool(): void {
	const root = document.getElementById('tool');
	if (!root) return;
	const $ = <T extends Element = HTMLElement>(sel: string) => root.querySelector(sel) as T;
	const $$ = (sel: string) => Array.from(root.querySelectorAll<HTMLElement>(sel));
	const mode = root.dataset.mode as 'test' | 'result';

	let test: Pick<TestStatus, 'id' | 'address' | 'expiresAt'> | null = null;
	let result: MailResult | null = null;
	let source: EventSource | null = null;
	let pollTimer = 0;
	let generation = 0; // invalidates callbacks of an old test after reset
	let guideTopic: GuideTopic = 'dmarc';
	let guides: GuideData | null = null;

	// ---- screens ----
	function show(screen: Screen) {
		for (const el of $$('[data-screen]')) el.hidden = el.dataset.screen !== screen;
		document.body.dataset.toolState = screen;
	}
	function announce(text: string) {
		$('[data-announce]').textContent = text;
	}
	function message(title: string, text: string) {
		$('[data-msg-title]').textContent = title;
		$('[data-msg-text]').textContent = text;
		show('msg');
		$('[data-msg-title]').focus();
	}

	// ---- test lifecycle ----
	async function newTest(): Promise<void> {
		const gen = ++generation;
		closeStream();
		result = null;
		resetAnimation();
		show('start');
		$('[data-address]').innerHTML = '<span class="address-loading">Adresse wird erstellt …</span>';
		$$('[data-action="copy"], [data-action="sent"]').forEach((b) => ((b as HTMLButtonElement).disabled = true));
		const res = await api<TestStatus & { message?: string }>('/api/tests', { method: 'POST' }).catch(() => null);
		if (gen !== generation) return;
		if (!res || !res.ok) {
			message('Gerade geht es nicht', res?.data?.message ?? 'Der Test-Server ist nicht erreichbar. Probier es in einer Minute noch einmal.');
			return;
		}
		test = { id: res.data.id, address: res.data.address, expiresAt: res.data.expiresAt };
		storage()?.setItem(STORE_KEY, JSON.stringify(test));
		showAddress();
		listen(gen);
	}

	function showAddress() {
		if (!test) return;
		const [local, domain] = test.address.split('@');
		$('[data-address]').innerHTML = `<span class="nw">${esc(local)}@</span><wbr><span class="nw">${esc(domain)}</span>`;
		$('[data-address-small]').textContent = test.address;
		$$('[data-action="copy"], [data-action="sent"]').forEach((b) => ((b as HTMLButtonElement).disabled = false));
	}

	async function resumeOrCreate() {
		const saved = storage()?.getItem(STORE_KEY);
		if (saved) {
			try {
				const t = JSON.parse(saved) as typeof test;
				const res = await api<TestStatus>(`/api/tests/${t!.id}`);
				if (res.ok && res.data.state === 'waiting') {
					test = t;
					showAddress();
					listen(++generation);
					return;
				}
			} catch {
				/* fall through to a new test */
			}
			storage()?.removeItem(STORE_KEY);
		}
		await newTest();
	}

	function closeStream() {
		source?.close();
		source = null;
		clearTimeout(pollTimer);
	}

	function listen(gen: number) {
		if (!test) return;
		const id = test.id;
		if ('EventSource' in window) {
			source = new EventSource(`/api/tests/${id}/events`);
			const handle = (e: MessageEvent) => gen === generation && onEvent(JSON.parse(e.data) as ProgressEvent);
			for (const type of ['step', 'done', 'error', 'expired']) source.addEventListener(type, handle as EventListener);
			let failures = 0;
			source.onerror = () => {
				// The browser reconnects by itself; after repeated failures switch to polling.
				if (++failures >= 3 || source?.readyState === EventSource.CLOSED) {
					source?.close();
					poll(gen, id);
				}
			};
			source.onopen = () => (failures = 0);
		} else {
			poll(gen, id);
		}
	}

	const seen = new Set<string>();
	async function poll(gen: number, id: string) {
		if (gen !== generation) return;
		const res = await api<TestStatus>(`/api/tests/${id}`).catch(() => null);
		if (gen !== generation) return;
		if (res?.ok) {
			for (const step of res.data.done) if (!seen.has(step)) onEvent({ type: 'step', step });
			if (res.data.state === 'done' && res.data.resultId) return onEvent({ type: 'done', resultId: res.data.resultId });
			if (res.data.state === 'expired') return onEvent({ type: 'expired' });
			if (res.data.state === 'error') return onEvent({ type: 'error', message: '' });
		}
		pollTimer = window.setTimeout(() => poll(gen, id), 2000);
	}

	function onEvent(e: ProgressEvent) {
		if (e.type === 'step') {
			if (seen.has(e.step)) return;
			seen.add(e.step);
		}
		if (e.type === 'expired') {
			closeStream();
			storage()?.removeItem(STORE_KEY);
			return message('Diese Adresse ist abgelaufen', 'Testadressen gelten 60 Minuten und nehmen genau eine Mail an. Hol dir einfach eine neue.');
		}
		if (e.type === 'error') {
			closeStream();
			storage()?.removeItem(STORE_KEY);
			return message('Da ist etwas schiefgelaufen', 'Die Auswertung deiner Mail ist fehlgeschlagen. Starte bitte einen neuen Test.');
		}
		if (e.type === 'done') closeStream();
		if (root!.querySelector('[data-screen="start"]:not([hidden])')) goWait();
		queue.push(e);
		pump();
	}

	// ---- animation, driven by the event queue ----
	const queue: ProgressEvent[] = [];
	let pumping = false;
	let doneCount = 0;

	function resetAnimation() {
		queue.length = 0;
		seen.clear();
		doneCount = 0;
		for (const li of $$('[data-step]')) li.dataset.state = 'pending';
		$$('[data-step]')[0].dataset.state = 'active';
		$('[data-orb]').className = 'orb waiting';
		$('[data-prog]').style.setProperty('--p', '0%');
		$('[data-sat]').hidden = false;
		$('[data-burst]').hidden = true;
		$('[data-scan]').hidden = true;
		$('[data-env-wait]').removeAttribute('hidden');
		$('[data-env-got]').setAttribute('hidden', '');
		$('[data-wait-title]').textContent = 'Wir warten auf deine Mail';
		$('[data-wait-sub]').textContent = 'Die Seite aktualisiert sich von selbst';
	}

	function goWait() {
		if (!$('[data-screen="wait"]').hidden) return;
		show('wait');
		$('[data-wait-title]').focus?.();
	}

	const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

	async function pump() {
		if (pumping) return;
		pumping = true;
		const gen = generation;
		while (queue.length && gen === generation) {
			const e = queue.shift()!;
			if (e.type === 'step') {
				markDone(e.step);
				await sleep(e.step === 'received' ? STEP_MS * 1.4 : STEP_MS);
			} else if (e.type === 'done') {
				await finish(e.resultId, gen);
			}
		}
		pumping = false;
	}

	function markDone(step: StepId) {
		const idx = STEPS.indexOf(step);
		const items = $$('[data-step]');
		items[idx].dataset.state = 'done';
		if (items[idx + 1]) items[idx + 1].dataset.state = 'active';
		doneCount = items.filter((li) => li.dataset.state === 'done').length;
		$('[data-prog]').style.setProperty('--p', `${Math.round((doneCount / STEPS.length) * 100)}%`);
		if (step === 'received') {
			$('[data-orb]').className = 'orb';
			$('[data-env-wait]').setAttribute('hidden', '');
			$('[data-env-got]').removeAttribute('hidden');
			$('[data-scan]').hidden = false;
			$('[data-wait-title]').textContent = 'Mail ist da. Wir prüfen sie';
			announce('Mail empfangen. Die Prüfung läuft.');
		}
		$('[data-wait-sub]').textContent = doneCount >= STEPS.length ? `Alle ${STEPS.length} Checks erledigt` : `Check ${doneCount} von ${STEPS.length}`;
	}

	async function finish(resultId: string, gen: number) {
		const res = await api<MailResult>(`/api/results/${resultId}`).catch(() => null);
		if (gen !== generation) return;
		$('[data-scan]').hidden = true;
		$('[data-sat]').hidden = true;
		$('[data-burst]').hidden = false;
		$('[data-orb]').className = 'orb done';
		$('[data-wait-title]').textContent = 'Fertig, gleich kommt dein Ergebnis';
		storage()?.removeItem(STORE_KEY);
		await sleep(reduced ? 200 : 1100);
		if (gen !== generation) return;
		if (!res?.ok) return message('Ergebnis nicht gefunden', 'Das Ergebnis konnte nicht geladen werden. Starte bitte einen neuen Test.');
		history.pushState({ resultId }, '', `/ergebnis/${resultId}`);
		renderResult(res.data);
	}

	// ---- result ----
	const BADGE: Record<Finding['status'], string> = { ok: 'OK', warn: 'Hinweis', bad: 'Problem', skip: 'Nicht geprüft' };
	const fmt = (n: number) => n.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

	function renderResult(r: MailResult) {
		result = r;
		const ring = $('[data-ring]');
		ring.className = `ring is-${r.light}`;
		$('[data-score]').textContent = fmt(r.score);
		$('[data-headline]').textContent = r.headline;
		$('[data-sub]').textContent = r.sub;
		const until = new Date(r.expiresAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
		$('[data-meta]').textContent = `${r.fromDomain ? `Absender-Domain: ${r.fromDomain} · ` : ''}Ergebnis abrufbar bis ${until}`;
		$('[data-setup]').hidden = !r.findings.some((f) => f.status === 'bad');

		const list = $('[data-checks]');
		list.innerHTML = '';
		let openedFirstProblem = false;
		r.findings.forEach((f, i) => {
			const li = document.createElement('li');
			li.className = `check is-${f.status}`;
			const bodyId = `check-${i}`;
			const open = !openedFirstProblem && f.status === 'bad';
			if (open) openedFirstProblem = true;
			const ded = f.deductions.length
				? `<p class="check-ded">${f.deductions.map((d) => `<strong>−${fmt(d.points)} Punkte</strong> · ${esc(d.reason)}`).join('<br>')}</p>`
				: '';
			const sug = f.suggestion
				? `<div class="copybox"><p class="copybox-host">Neuer ${esc(f.suggestion.type)}-Eintrag, Name/Host: <code>${esc(f.suggestion.host)}</code></p><pre class="code">${esc(f.suggestion.value)}</pre><button type="button" class="chip" data-copy="${esc(f.suggestion.value)}">Wert kopieren</button></div>`
				: '';
			const fix = f.guide ? `<button type="button" class="btn btn-ink btn-sm" data-fix="${f.guide}" style="align-self:flex-start">So behebst du das</button>` : '';
			const rawRows = Object.entries(f.raw ?? {})
				.filter(([, v]) => v !== null && v !== undefined && v !== '')
				.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(typeof v === 'string' ? v : JSON.stringify(v))}</dd>`)
				.join('');
			li.innerHTML = `
				<button type="button" class="check-row" aria-expanded="${open}" aria-controls="${bodyId}">
					<span class="dot" aria-hidden="true"></span>
					<span class="check-name"><span class="check-title">${esc(f.title)}</span><span class="check-tech">${esc(f.tech)}</span></span>
					<span class="tag">${BADGE[f.status]}</span>
				</button>
				<div class="check-body" id="${bodyId}" ${open ? '' : 'hidden'}>
					<p class="check-text">${esc(f.text)}</p>
					${ded}${sug}${fix}
					${rawRows ? `<details class="raw"><summary>Technische Details</summary><dl>${rawRows}</dl></details>` : ''}
				</div>`;
			list.appendChild(li);
		});
		show('result');
		announce(`Ergebnis: ${fmt(r.score)} von 10. ${r.headline}.`);
		$('[data-headline]').focus();
	}

	// ---- guide ----
	async function openGuide(topic: GuideTopic) {
		guideTopic = topic;
		$('[data-guide-title]').textContent = TOPIC_TITLES[topic].title;
		$('[data-guide-lead]').textContent = TOPIC_TITLES[topic].lead;
		$('#provider-label').textContent = topic === 'dkim' ? 'Wer verschickt deine Mails?' : 'Wo liegt deine Domain?';
		show('guide');
		$('[data-guide-title]').focus();
		window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
		if (!guides) guides = await fetch('/anleitungen.json').then((r) => r.json() as Promise<GuideData>).catch(() => ({}));
		let provider: string | null = null;
		try {
			provider = localStorage.getItem('emc-provider');
		} catch {
			/* no storage */
		}
		provider = (result && guessProvider(result)) ?? provider ?? 'ionos';
		pickProvider(provider);
	}

	function pickProvider(provider: string) {
		for (const chip of $$('[data-provider]')) chip.setAttribute('aria-pressed', String(chip.dataset.provider === provider));
		try {
			localStorage.setItem('emc-provider', provider);
		} catch {
			/* no storage */
		}
		const g = guides?.[provider];
		const steps = g?.schritte[guideTopic] ?? GENERIC[guideTopic];
		const domain = result?.fromDomain ?? 'deine-domain.de';
		$('[data-guide-steps]').innerHTML = steps
			.map((s, i) => {
				const box = s.eintrag
					? `<div class="copybox"><p class="copybox-host">Typ <code>${esc(s.eintrag.typ)}</code> · Name/Host <code>${esc(s.eintrag.host.replaceAll('{domain}', domain))}</code></p><pre class="code">${esc(s.eintrag.wert.replaceAll('{domain}', domain))}</pre><button type="button" class="chip" data-copy="${esc(s.eintrag.wert.replaceAll('{domain}', domain))}">Wert kopieren</button></div>`
					: '';
				return `<li class="gstep"><span class="gnum" aria-hidden="true">${i + 1}</span><div class="gtext"><p>${inline(s.text)}</p>${box}</div></li>`;
			})
			.join('');
		const link = $<HTMLAnchorElement>('[data-guide-link]');
		link.href = g?.url[guideTopic] ?? `/wissen/${guideTopic}`;
		link.textContent = g ? `Ausführliche Anleitung für ${g.name}` : 'Ausführlich erklärt';
	}

	// ---- actions ----
	root.addEventListener('click', async (ev) => {
		const t = ev.target as HTMLElement;
		const btn = t.closest<HTMLElement>('button, [data-action]');
		if (!btn) return;
		const action = btn.dataset.action;
		if (action === 'copy' && test) {
			await copyText(test.address);
			flash(btn, 'Kopiert');
		} else if (action === 'sent') {
			goWait();
		} else if (action === 'reset' || action === 'retest') {
			if (mode === 'result') return void (location.href = '/');
			storage()?.removeItem(STORE_KEY);
			history.pushState({}, '', '/');
			await newTest();
			window.scrollTo({ top: 0 });
			$<HTMLButtonElement>('[data-action="copy"]').focus();
		} else if (action === 'share' && result) {
			const url = `${location.origin}/ergebnis/${result.id}`;
			if (navigator.share && matchMedia('(pointer: coarse)').matches) {
				navigator.share({ title: `E-Mail-Check: ${fmt(result.score)} von 10`, url }).catch(() => undefined);
			} else {
				await copyText(url);
				flash(btn, 'Link kopiert');
			}
		} else if (action === 'back') {
			show('result');
			$('[data-headline]').focus();
		} else if (btn.dataset.fix) {
			openGuide(btn.dataset.fix as GuideTopic);
		} else if (btn.dataset.provider) {
			pickProvider(btn.dataset.provider);
		} else if (btn.dataset.copy !== undefined) {
			await copyText(btn.dataset.copy);
			flash(btn, 'Kopiert');
		} else if (btn.classList.contains('check-row')) {
			const body = document.getElementById(btn.getAttribute('aria-controls')!)!;
			const open = btn.getAttribute('aria-expanded') !== 'true';
			btn.setAttribute('aria-expanded', String(open));
			body.hidden = !open;
		}
	});
	// Header button lives outside the tool section.
	document.querySelectorAll<HTMLElement>('.site-header [data-action="reset"]').forEach((b) =>
		b.addEventListener('click', () => root.querySelector<HTMLElement>('[data-new-test]')?.click()),
	);

	window.addEventListener('popstate', () => {
		if (location.pathname === '/' && mode === 'test') newTest();
	});

	// ---- boot ----
	if (mode === 'result') {
		const id = location.pathname.split('/').filter(Boolean)[1] ?? '';
		api<MailResult & { message?: string }>(`/api/results/${encodeURIComponent(id)}`)
			.then((res) => (res.ok ? renderResult(res.data) : message('Ergebnis nicht gefunden', 'Ergebnisse werden nach 7 Tagen automatisch gelöscht. Mach einfach einen neuen Test.')))
			.catch(() => message('Gerade geht es nicht', 'Der Server ist nicht erreichbar. Probier es gleich noch einmal.'));
	} else {
		resetAnimation();
		resumeOrCreate();
	}
}
