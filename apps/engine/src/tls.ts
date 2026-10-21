// STARTTLS certificate: loaded from files (written by the certsync container from Caddy's ACME storage)
// and reloaded when they change, because Let's Encrypt certificates are renewed every ~60 days.
import { existsSync, readFileSync, statSync } from 'node:fs';
import type { SMTPServer } from 'smtp-server';

export interface TlsFiles {
	key: string;
	cert: string;
}

export function readTls(files: TlsFiles): { key: Buffer; cert: Buffer } | null {
	if (!existsSync(files.key) || !existsSync(files.cert)) return null;
	return { key: readFileSync(files.key), cert: readFileSync(files.cert) };
}

/** Waits until both files exist (fresh server: Caddy may still be fetching the certificate). */
export async function waitForTls(files: TlsFiles, timeoutMs: number, pollMs = 5000): Promise<{ key: Buffer; cert: Buffer } | null> {
	const until = Date.now() + timeoutMs;
	for (;;) {
		const tls = readTls(files);
		if (tls || Date.now() >= until) return tls;
		await new Promise((r) => setTimeout(r, pollMs));
	}
}

/** Re-reads the certificate when its modification time changes. Returns a stop function. */
export function watchTls(server: SMTPServer, files: TlsFiles, intervalMs = 3600_000): () => void {
	let last = existsSync(files.cert) ? statSync(files.cert).mtimeMs : 0;
	const timer = setInterval(() => {
		try {
			const mtime = statSync(files.cert).mtimeMs;
			if (mtime === last) return;
			const tls = readTls(files);
			if (!tls) return;
			server.updateSecureContext(tls);
			last = mtime;
			console.log('tls: certificate reloaded');
		} catch (err) {
			console.error('tls: reload failed', (err as Error).message);
		}
	}, intervalMs);
	timer.unref();
	return () => clearInterval(timer);
}
