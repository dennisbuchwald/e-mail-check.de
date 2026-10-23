import { serve } from '@hono/node-server';
import { rspamdScanner } from './analyze.ts';
import { createApi } from './api.ts';
import { config } from './config.ts';
import { createResolver } from './dns.ts';
import { createSecLookup } from './dnssec.ts';
import { TestService } from './service.ts';
import { createSmtpServer } from './smtp.ts';
import { Store } from './store.ts';
import { waitForTls, watchTls } from './tls.ts';

const store = new Store(config.dbPath, { mailsCheckedSeed: config.mailsCheckedSeed });
const resolver = createResolver(config.dnsServers);
// DNSSEC flag only from our own validating resolver; with the system resolver the bonus checks are off.
const secLookup = config.dnsServers[0] ? createSecLookup(config.dnsServers[0]) : undefined;
const service = new TestService({
	store,
	testDomain: config.testDomain,
	testTtlMinutes: config.testTtlMinutes,
	deps: { resolver, mta: config.hostname, resultTtlDays: config.resultTtlDays, scanContent: rspamdScanner(config.rspamdUrl), ...(secLookup ? { secLookup } : {}) },
});

// Hourly cleanup: results older than 7 days are deleted.
const purge = () => console.log(`purge: ${store.purge()} rows deleted`);
purge();
setInterval(purge, 3600_000).unref();

const api = createApi({ service, resolver, rateLimit: config.rateLimit, trustProxy: config.trustProxy, siteUrl: config.siteUrl, ...(secLookup ? { secLookup } : {}) });
const http = serve({ fetch: api.fetch, port: config.httpPort }, () => console.log(`api listening on :${config.httpPort}`));

// Production: STARTTLS with the certificate Caddy fetched for the MX hostname. A fresh server may still be
// fetching it: wait a moment, then start without STARTTLS and restart as soon as the certificate appears
// (Docker brings the engine back up, now with TLS). Before, SMTP waited up to 10 minutes and never got TLS later.
const tlsFiles = config.tls;
const tls = tlsFiles ? await waitForTls(tlsFiles, 30_000) : null;
if (tlsFiles && !tls) {
	console.error(`tls: no certificate at ${tlsFiles.cert} yet, SMTP starts WITHOUT STARTTLS and restarts once it is there`);
	void waitForTls(tlsFiles, Number.POSITIVE_INFINITY, 30_000).then(() => {
		console.log('tls: certificate found, restarting for STARTTLS');
		process.kill(process.pid, 'SIGTERM');
	});
}
const smtp = createSmtpServer(service, { hostname: config.hostname, maxMessageBytes: config.maxMessageBytes, allowXclient: config.allowXclient, tls: tls ?? undefined });
if (tlsFiles && tls) watchTls(smtp, tlsFiles);
smtp.listen(config.smtpPort, () =>
	console.log(`smtp listening on :${config.smtpPort} for *@${config.testDomain}${tls ? ' (STARTTLS)' : ''}${config.allowXclient ? ' (XCLIENT on)' : ''}`),
);


const shutdown = () => {
	smtp.close(() => undefined);
	http.close();
	store.close();
	process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
