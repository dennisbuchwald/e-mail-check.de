// Large senders that run their own mail infrastructure. Their servers send for millions of customers; small,
// aggressive blocklists sometimes list them by mistake, and the person testing cannot change that.
// Recognised by the verified rDNS name or a HELO name that resolves back to the sending IP.
export interface BigSender {
	name: string;
	/** Hostname suffixes (lower case). */
	suffixes: string[];
}

export const BIG_SENDERS: BigSender[] = [
	{ name: 'Google', suffixes: ['.google.com', '.googlemail.com'] },
	{ name: 'Microsoft', suffixes: ['.outlook.com', '.protection.outlook.com', '.hotmail.com', '.office365.com'] },
	{ name: 'Apple', suffixes: ['.icloud.com', '.me.com', '.apple.com'] },
	{ name: 'Amazon SES', suffixes: ['.amazonses.com'] },
	{ name: 'Mailchimp', suffixes: ['.mcsv.net', '.mcdlv.net', '.rsgsv.net', '.mandrillapp.com'] },
	{ name: 'Brevo', suffixes: ['.sendinblue.com', '.brevo.com'] },
	{ name: 'SendGrid', suffixes: ['.sendgrid.net'] },
	{ name: 'Mailgun', suffixes: ['.mailgun.net', '.mailgun.org'] },
	{ name: 'Mailjet', suffixes: ['.mailjet.com'] },
	{ name: 'Postmark', suffixes: ['.mtasv.net', '.postmarkapp.com'] },
	{ name: 'SparkPost', suffixes: ['.sparkpostmail.com'] },
	{ name: 'CleverReach', suffixes: ['.crsend.com'] },
	{ name: 'HubSpot', suffixes: ['.hubspotemail.net'] },
	{ name: 'Klaviyo', suffixes: ['.klaviyomail.com'] },
	{ name: 'GMX und WEB.DE', suffixes: ['.gmx.net', '.web.de', '.ui-portal.com'] },
	{ name: 'IONOS', suffixes: ['.kundenserver.de', '.ionos.de', '.ionos.com'] },
];

/** The big sender a verified host name belongs to, or null. */
export function bigSenderOf(...hosts: (string | null | undefined)[]): string | null {
	for (const h of hosts) {
		const host = `.${(h ?? '').toLowerCase().replace(/\.$/, '')}`;
		if (host === '.') continue;
		const hit = BIG_SENDERS.find((s) => s.suffixes.some((x) => host.endsWith(x)));
		if (hit) return hit.name;
	}
	return null;
}
