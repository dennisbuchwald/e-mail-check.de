// Generates the .eml fixtures and the fake DNS zone used by the tests.
// Run: node scripts/make-fixtures.ts  (keys are test-only and committed on purpose)
import { generateKeyPairSync, createPublicKey } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dkimSign } from 'mailauth/lib/dkim/sign';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'test', 'fixtures');
mkdirSync(dir, { recursive: true });

const keyFile = join(dir, 'test-dkim-private.pem');
if (!existsSync(keyFile)) {
	const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
	writeFileSync(keyFile, privateKey.export({ type: 'pkcs8', format: 'pem' }));
}
const privateKey = readFileSync(keyFile, 'utf8');
const publicDer = createPublicKey(privateKey).export({ type: 'spki', format: 'der' }).toString('base64');
const dkimTxt = `v=DKIM1; k=rsa; p=${publicDer}`;

export const GOOD_IP = '203.0.113.10';
export const LISTED_IP = '203.0.113.66';

// Fake zone: "name TYPE" → answers. TXT answers are arrays of chunks like dns.resolveTxt.
const zone: Record<string, unknown> = {};
const txt = (name: string, value: string) => ((zone[`${name} TXT`] ??= [] as string[][]) as string[][]).push([value]);

for (const d of ['gut.example.test', 'ohne-dkim.example.test', 'ohne-dmarc.example.test', 'dkim-kaputt.example.test']) {
	txt(d, 'v=spf1 ip4:203.0.113.0/24 -all');
}
txt('softfail.example.test', 'v=spf1 ip4:198.51.100.1 ~all');
for (const d of ['gut.example.test', 'ohne-spf.example.test', 'ohne-dmarc.example.test', 'softfail.example.test']) {
	txt(`s1._domainkey.${d}`, dkimTxt);
}
txt('_dmarc.gut.example.test', 'v=DMARC1; p=reject; rua=mailto:dmarc@gut.example.test');
txt('_dmarc.ohne-spf.example.test', 'v=DMARC1; p=quarantine');
txt('_dmarc.ohne-dkim.example.test', 'v=DMARC1; p=none');
txt('_dmarc.dkim-kaputt.example.test', 'v=DMARC1; p=reject');
txt('_dmarc.softfail.example.test', 'v=DMARC1; p=reject');
// Freemail case like a real iCloud test (test-only zone, the real icloud.com is never queried in tests).
txt('icloud.com', 'v=spf1 ip4:203.0.113.0/24 -all');
txt('s1._domainkey.icloud.com', dkimTxt);
txt('_dmarc.icloud.com', 'v=DMARC1; p=quarantine; sp=quarantine');
// PTR + forward confirmation for the sending IPs.
zone['10.113.0.203.in-addr.arpa PTR'] = ['mail.gut.example.test'];
zone['mail.gut.example.test A'] = [GOOD_IP];
zone['66.113.0.203.in-addr.arpa PTR'] = ['mail.spammer.example.test'];
zone['mail.spammer.example.test A'] = [LISTED_IP];
zone['66.113.0.203.zen.spamhaus.org A'] = ['127.0.0.2'];
writeFileSync(join(dir, 'dns.json'), JSON.stringify(zone, null, '\t') + '\n');

function mail(from: string, subject: string, body: string, extra = ''): string {
	return [
		`From: Max Mustermann <${from}>`,
		'To: k7m2x9qa@test.e-mail-check.de',
		`Subject: ${subject}`,
		'Date: Tue, 20 Oct 2026 10:00:00 +0200',
		`Message-ID: <${subject.length}.${from.replace(/\W/g, '')}@example.test>`,
		'MIME-Version: 1.0',
		'Content-Type: text/plain; charset=utf-8',
		'Content-Transfer-Encoding: 8bit',
		extra,
		'',
		body,
		'',
	]
		.filter((l, i) => l !== '' || i > 8)
		.join('\r\n');
}

async function sign(msg: string, domain: string): Promise<string> {
	const res = await dkimSign(msg, { signTime: new Date('2026-10-20T08:00:00Z'), signatureData: [{ signingDomain: domain, selector: 's1', privateKey }] });
	if (res.errors.length) throw new Error(JSON.stringify(res.errors));
	return res.signatures + msg;
}

const body = 'Hallo,\r\n\r\nanbei wie besprochen das Angebot für die neue Website.\r\nMeld dich gern, wenn du Fragen hast.\r\n\r\nViele Grüße\r\nMax';
const fixtures: Record<string, string> = {
	'gut.eml': await sign(mail('max@gut.example.test', 'Angebot Website', body), 'gut.example.test'),
	'ohne-spf.eml': await sign(mail('max@ohne-spf.example.test', 'Angebot Website', body), 'ohne-spf.example.test'),
	'ohne-dkim.eml': mail('max@ohne-dkim.example.test', 'Angebot Website', body),
	'ohne-dmarc.eml': await sign(mail('max@ohne-dmarc.example.test', 'Angebot Website', body), 'ohne-dmarc.example.test'),
	'softfail.eml': await sign(mail('max@softfail.example.test', 'Angebot Website', body), 'softfail.example.test'),
	// Body changed after signing → body hash mismatch.
	'dkim-kaputt.eml': (await sign(mail('max@dkim-kaputt.example.test', 'Angebot Website', body), 'gut.example.test')).replace('Angebot für', 'Angebot über'),
	'spam.eml': await sign(
		mail('max@gut.example.test', 'JETZT GEWINNEN GRATIS', 'XJS*C4JDBQADN1.NSBN3*2IDNEN*GTUBE-STANDARD-ANTI-UBE-TEST-EMAIL*C.34X'),
		'gut.example.test',
	),
	'sperrliste.eml': await sign(mail('max@gut.example.test', 'Angebot Website', body), 'gut.example.test'),
	// Freemail sender with a real-looking delivery chain (Received headers, newest first).
	'freemail.eml':
		[
			'Received: from outbound.mr.icloud.com by mr-2004c.eps.apple.com (Postfix) with ESMTPS id 4c1; Tue, 20 Oct 2026 10:00:10 +0200',
			'Received: from [192.168.1.20] by p00-icloudmta-asmtp.me.com (Postfix) with ESMTPSA id 9a2; Tue, 20 Oct 2026 10:00:08 +0200',
		].join('\r\n') +
		'\r\n' +
		(await sign(mail('max.muster@icloud.com', 'Angebot Website', body), 'icloud.com')),
};
for (const [name, content] of Object.entries(fixtures)) writeFileSync(join(dir, name), content);
console.log(`Wrote ${Object.keys(fixtures).length} fixtures + dns.json to ${dir}`);
