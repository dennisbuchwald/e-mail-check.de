// German names for rspamd rules (rspamd-symbole.de.json). Unknown rules are shown with their original name.
import data from './rspamd-symbole.de.json' with { type: 'json' };

export const RSPAMD_SYMBOLE = Object.fromEntries(Object.entries(data).filter(([k]) => !k.startsWith('_'))) as Record<string, { titel: string; text: string }>;

export function ruleTitle(name: string): string {
	return RSPAMD_SYMBOLE[name]?.titel ?? name;
}
