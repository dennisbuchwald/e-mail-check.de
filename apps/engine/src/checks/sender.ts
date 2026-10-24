// Station 1 (Absender), next to SPF: does the mail come from an own domain or from a freemail address?
import { isFreemail, POINTS, type Finding, type Reach } from '@emc/shared';

/** Where replies (From) and bounces (Return-Path) go, see checks/reachability.ts. */
export interface Reachability {
	from: Reach;
	returnPath: { domain: string; reach: Reach } | null;
}

export function senderFinding(fromDomain: string | null, reach?: Reachability): Finding {
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
			raw: { domain: fromDomain, freemail: true, ...(reach ? { reach } : {}) },
		};
	}
	const raw = { domain: fromDomain, freemail: false, ...(reach ? { reach } : {}) };
	// A hint without points: the mail itself arrives, but answers or bounces go nowhere.
	const rp = reach?.returnPath;
	if (reach?.from === 'none') {
		return { ...base, status: 'warn', title: 'Antworten kommen nicht an', text: `${fromDomain} kann keine Mails empfangen (kein MX-Eintrag). Wer auf deine Mail antwortet, bekommt eine Fehlermeldung. Richte für die Absenderadresse ein Postfach ein oder schick von einer Adresse, die Antworten annimmt. Punkte kostet das nicht.`, deductions: [], raw };
	}
	if (rp && rp.reach === 'none') {
		return { ...base, status: 'warn', title: 'Rückläufer gehen verloren', text: `Die Rücklauf-Adresse deiner Mail liegt bei ${rp.domain}, und diese Domain nimmt keine Mails an. Meldungen über unzustellbare Mails erreichen dich deshalb nie. Das stellst du im Versanddienst oder Formular-Plugin ein (Return-Path bzw. Envelope-From). Punkte kostet das nicht.`, deductions: [], raw };
	}
	return { ...base, status: 'ok', title: 'Eigene Absender-Domain', text: `Du schickst von deiner eigenen Domain ${fromDomain}.`, deductions: [], raw };
}
