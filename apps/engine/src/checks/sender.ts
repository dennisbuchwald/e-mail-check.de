// Station 1 (Absender), next to SPF: does the mail come from an own domain or from a freemail address?
import { isFreemail, POINTS, type Finding } from '@emc/shared';

export function senderFinding(fromDomain: string | null): Finding {
	const base = { id: 'sender' as const, tech: 'Absender-Domain' };
	if (!fromDomain) {
		return { ...base, status: 'skip', title: 'Absender-Domain unbekannt', text: 'Die Mail hat keine lesbare Absenderadresse.', deductions: [], raw: { domain: null } };
	}
	if (isFreemail(fromDomain)) {
		return {
			...base,
			status: 'warn',
			title: 'Absender mit Freemail-Adresse',
			text: `Du schickst von einer kostenlosen Adresse (${fromDomain}). Für Kunden- und Firmenmails lieber eine Adresse deiner eigenen Domain nutzen: Das wirkt seriöser, und Spamfilter sind bei Freemail-Absendern strenger. Punkte kostet das nicht, weil deine Mail sauber ankommt.`,
			deductions: POINTS.sender.freemail ? [{ reason: 'Freemail-Absender', points: POINTS.sender.freemail }] : [],
			raw: { domain: fromDomain, freemail: true },
		};
	}
	return { ...base, status: 'ok', title: 'Eigene Absender-Domain', text: `Du schickst von deiner eigenen Domain ${fromDomain}.`, deductions: [], raw: { domain: fromDomain, freemail: false } };
}
