// The result markup and its styles, loaded only when a result is shown (audit: about 11 KB CSS and the
// renderer used to ship with every start page). The stylesheet is linked by URL: a plain CSS import would be
// hoisted into every page by the bundler. The result page imports result.css itself (server-rendered markup).
import cssUrl from '../styles/result.css?url';

export { renderResultView } from '@emc/shared/result-view';

/** Resolves once the result styles are there (at once on the result page, where they come with the HTML). */
export function resultStyles(): Promise<void> {
	if (document.querySelector('[data-result-css]') || document.querySelector('.rv-styles-loaded')) return Promise.resolve();
	return new Promise((resolve) => {
		const link = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: cssUrl });
		link.dataset.resultCss = '';
		link.onload = link.onerror = () => resolve();
		document.head.append(link);
	});
}
