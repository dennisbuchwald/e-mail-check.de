// Sends a test mail into the local stack.
// Usage: node scripts/send-test.ts <testadresse> [absender] [ip]
// Default sender ip 209.85.220.41 is a Google mail server, so SPF for Google Workspace domains passes.
import { sendMail } from '../tests/e2e/smtp.ts';

const [to, from = 'test@example.com', ip = '209.85.220.41'] = process.argv.slice(2);
if (!to) {
	console.error('Usage: node scripts/send-test.ts <testadresse> [absender] [ip]');
	process.exit(1);
}
const codes = await sendMail(to, { from, ip, helo: 'mail.local.test', subject: 'Testmail von e-mail-check.de lokal', body: 'Hallo,\r\n\r\ndas ist eine lokale Testmail.\r\n\r\nViele Grüße' });
console.log(codes.includes(550) ? 'Adresse unbekannt oder abgelaufen (550).' : codes.at(-2) === 250 ? `Mail an ${to} eingeliefert.` : `SMTP-Antworten: ${codes.join(', ')}`);
