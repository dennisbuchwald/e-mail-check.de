const env = process.env;

export const config = {
	/** Domain the test addresses live on (MX points here in production). */
	testDomain: env.TEST_DOMAIN ?? 'test.e-mail-check.de',
	/** Public site URL, used for share links in server-rendered results. */
	siteUrl: (env.SITE_URL ?? 'https://e-mail-check.de').replace(/\/$/, ''),
	/** Hostname this server announces in SMTP and Authentication-Results. */
	hostname: env.MX_HOSTNAME ?? 'mx.e-mail-check.de',
	smtpPort: Number(env.SMTP_PORT ?? 2525),
	httpPort: Number(env.HTTP_PORT ?? 8787),
	/** Allow XCLIENT so local tests can simulate a real sender IP. Never enable in production. */
	allowXclient: env.ALLOW_XCLIENT === '1',
	rspamdUrl: env.RSPAMD_URL ?? 'http://localhost:11333',
	/** Own recursive resolver (unbound). Empty = system resolver. */
	dnsServers: (env.DNS_SERVERS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
	dbPath: env.DB_PATH ?? './data/e-mail-check.sqlite',
	/** Restore value for the all-time counter after a lost volume (never lowers it). */
	mailsCheckedSeed: Number(env.MAILS_CHECKED_SEED ?? 0),
	/** How long a fresh test address accepts mail. */
	testTtlMinutes: Number(env.TEST_TTL_MINUTES ?? 60),
	resultTtlDays: Number(env.RESULT_TTL_DAYS ?? 7),
	maxMessageBytes: Number(env.MAX_MESSAGE_BYTES ?? 10 * 1024 * 1024),
	/** Requests per hour and IP. */
	rateLimit: {
		tests: Number(env.RATE_LIMIT_TESTS ?? 10),
		dns: Number(env.RATE_LIMIT_DNS ?? 30),
	},
	/** STARTTLS key/cert files; both must be set to enable TLS. */
	tls: env.TLS_KEY && env.TLS_CERT ? { key: env.TLS_KEY, cert: env.TLS_CERT } : null,
	/** Trust X-Forwarded-For from the reverse proxy. Off unless set: only Caddy may reach the API (compose sets it). */
	trustProxy: env.TRUST_PROXY === '1',
};

export type Config = typeof config;
