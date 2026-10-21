// Which hairline figure belongs to which topic (CLAUDE.md, Design: Illustrationen).
export type FigureName = 'hub' | 'vault' | 'padlock' | 'router' | 'relay' | 'sieve' | 'loupe' | 'dish';

export const TOPIC_FIGURE: Record<string, { name: FigureName; label: string }> = {
	spf: { name: 'hub', label: 'Netz aus Kacheln um einen Knoten: welche Server für deine Domain senden dürfen' },
	dkim: { name: 'vault', label: 'Tresortür mit Zahlenschloss: die digitale Unterschrift deiner Mail' },
	dmarc: { name: 'padlock', label: 'Vorhängeschloss: die Regel gegen Fälschungen in deinem Namen' },
	'mails-landen-im-spam': { name: 'router', label: 'Router mit Antennen: der Ruf deines Mailservers' },
	'spf-dkim-dmarc': { name: 'relay', label: 'Weg über mehrere Stationen: SPF, DKIM und DMARC zusammen' },
	'spf-dkim-dmarc-sammel': { name: 'relay', label: 'Weg über mehrere Stationen: SPF, DKIM und DMARC zusammen' },
};
