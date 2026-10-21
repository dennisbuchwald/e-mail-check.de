// Newsletter hygiene: Gmail and Yahoo require a List-Unsubscribe header (with one-click) from bulk senders since 2024.

export interface UnsubscribeReport {
	/** Looks like a newsletter / bulk mail. */
	bulk: boolean;
	/** List-Unsubscribe header present. */
	header: boolean;
	/** RFC 8058 one-click: List-Unsubscribe-Post: List-Unsubscribe=One-Click plus an https URL. */
	oneClick: boolean;
}

const BULK_HEADERS = /^(list-id|x-campaign|x-campaignid|x-mc-user|x-mailchimp|x-sib-id|x-mailjet-campaign|x-cr-|x-newsletter|x-rpcampaign|x-mailer-recptid|x-ems-|x-csa-complaints)/i;

/** headerLines: raw header lines as [lowercased key, value]. A designed HTML mail with many links counts as a newsletter too. */
export function analyzeUnsubscribe(headerLines: [string, string][], hasUnsubscribeLink: boolean, layout: { links: number; html: boolean } = { links: 0, html: false }): UnsubscribeReport {
	const get = (key: string) => headerLines.find(([k]) => k === key)?.[1] ?? '';
	const listUnsub = get('list-unsubscribe');
	const post = get('list-unsubscribe-post');
	const precedence = get('precedence').toLowerCase();
	const bulk = !!listUnsub || /bulk|list/.test(precedence) || headerLines.some(([k]) => BULK_HEADERS.test(k)) || hasUnsubscribeLink || (layout.html && layout.links >= 8);
	return {
		bulk,
		header: !!listUnsub,
		oneClick: /list-unsubscribe=one-click/i.test(post) && /<https:\/\//i.test(listUnsub),
	};
}
