---
titel: "DKIM bei STRATO einrichten: Was automatisch läuft und was du tun musst"
seoTitel: "STRATO DKIM einrichten: aktivieren und prüfen"
beschreibung: "Bei STRATO ist DKIM für eigene Mails schon aktiv. So prüfst du das und richtest DKIM für Newsletter-Tools und andere Versender ein."
keyword: "strato dkim"
anbieter: "strato"
anbieterName: "STRATO"
themen: ["dkim"]
dauer: "10 Minuten"
kurzantwort: "Bei STRATO ist DKIM für eigene Mails automatisch aktiv: STRATO unterschreibt seit Jahren alle Mails, die über smtp.strato.de rausgehen. Du musst nur etwas tun, wenn ein externer Dienst wie ein Newsletter-Tool oder Microsoft 365 in deinem Namen verschickt oder deine Domain eigene Nameserver nutzt."
schritte:
  dkim:
    - text: "Prüfen, ob deine Mail über **smtp.strato.de** rausgeht. Dann ist DKIM schon aktiv und du musst nichts tun."
    - text: "Für externe Dienste: Im STRATO Kunden-Login die **Domainverwaltung** öffnen und bei der Domain auf das **Zahnrad** klicken."
    - text: "Menüpunkt **DNS** wählen, dann bei **TXT- und CNAME-Records** auf **verwalten** klicken."
    - text: "Die DKIM-Einträge eintragen, die dir dein Newsletter-Tool oder Microsoft 365 anzeigt (meist CNAME, manchmal TXT). Präfix nur in Kleinbuchstaben."
    - text: "Speichern, im Dienst die Domain bestätigen und nach einigen Stunden mit einer Testmail prüfen."
faq:
  - frage: "Ist DKIM bei STRATO automatisch aktiv?"
    antwort: "Ja. STRATO unterschreibt alle Mails mit DKIM, die ausschließlich über die STRATO-Mailserver (smtp.strato.de) verschickt werden. Das gilt laut STRATO schon seit Jahren."
  - frage: "Warum findet ein DKIM-Check bei meiner STRATO-Domain nichts?"
    antwort: "Die meisten Prüftools brauchen den Selektor, also den Namen vor ._domainkey. STRATO nutzt derzeit strato-dkim-0002 und strato-dkim-0003 und wechselt sie gelegentlich. Am zuverlässigsten prüfst du DKIM deshalb mit einer echten Testmail."
  - frage: "Muss ich bei STRATO DKIM-Einträge selbst pflegen?"
    antwort: "Nur in zwei Fällen: wenn ein externer Dienst in deinem Namen verschickt, oder wenn deine Domain eigene Nameserver nutzt, du aber STRATO-Mail verwendest. Im zweiten Fall musst du nachziehen, wenn STRATO die Selektoren wechselt."
  - frage: "Welche Zeichen sind im DKIM-Präfix bei STRATO erlaubt?"
    antwort: "Laut STRATO nur Kleinbuchstaben a bis z ohne Umlaute, Ziffern 0 bis 9 und die Sonderzeichen Bindestrich, Plus, Stern, Punkt und Unterstrich. Großbuchstaben aus der Vorlage deines Newsletter-Tools schreibst du klein."
quelle:
  - titel: "STRATO FAQ: Wie kann ich für meine Domain die DKIM-Einstellungen ändern?"
    url: "https://www.strato.de/faq/mail/wie-kann-ich-fuer-meine-domain-die-dkim-einstellungen-aendern/"
  - titel: "STRATO FAQ: Wie kann ich bei STRATO meine DNS-Einträge verwalten?"
    url: "https://www.strato.de/faq/domains/wie-kann-ich-bei-strato-meine-dns-eintraege-verwalten/"
  - titel: "Microsoft Learn: DKIM für eigene Domains konfigurieren"
    url: "https://learn.microsoft.com/de-de/defender-office-365/email-authentication-dkim-configure"
stand: "2026-10-21"
geprueft: false
offenePunkte:
  - "Oberfläche prüfen: Lässt STRATO bei TXT-Records lange DKIM-Schlüssel (2048 Bit) in einem Feld zu? Die FAQ nennt kein Limit."
  - "CNAME-Ziele aus FAQ #539 per DNS bestätigt (21.10.2026): strato-dkim-0002 (RSA) und strato-dkim-0003 (Ed25519). STRATO kündigt Selektorwechsel nicht an, Werte vor Veröffentlichung erneut prüfen."
---

## Vorher prüfen: Sind deine Mails schon unterschrieben?

Verschickst du nur aus deinem STRATO-Postfach, ist DKIM wahrscheinlich längst aktiv. Prüf das trotzdem, bevor du etwas änderst. Schick über den [Mail-Test](/) eine Testmail. Unter **Mail unterschrieben** siehst du, ob die Signatur gültig ist und zu deiner Domain passt.

Der [DKIM-Check](/dkim-check) funktioniert auch ohne Testmail. Weil STRATO seine Selektoren gelegentlich wechselt, ist die Testmail bei STRATO aber die sicherere Wahl. Was DKIM genau ist, liest du in [DKIM einfach erklärt](/wissen/dkim).

## Schritt für Schritt: So findest du die DKIM-Einstellungen bei STRATO

Für Mails über `smtp.strato.de` musst du nichts einrichten. Die folgenden Schritte brauchst du nur, wenn ein externer Dienst eigene DKIM-Einträge verlangt:

1. Melde dich im STRATO Kunden-Login an und öffne die **Domainverwaltung**.
2. Klick bei deiner Domain auf das **Zahnrad**.
3. Wähle den Menüpunkt **DNS**.
4. Klick bei **TXT- und CNAME-Records** auf **verwalten**.
5. Leg hier die DKIM-Einträge an, die dir der externe Dienst anzeigt.

Ein paar Regeln von STRATO, die oft zu Fehlermeldungen führen:

- **Präfix ohne Domain.** Du trägst nur den vorderen Teil ein, zum Beispiel `selector1._domainkey`. STRATO hängt deine Domain automatisch an.
- **Nur Kleinbuchstaben.** Erlaubt sind a bis z ohne Umlaute, 0 bis 9 und die Zeichen `- + * . _`.
- **CNAME nur für Subdomains.** Ein DKIM-Eintrag wie `selector1._domainkey` ist so eine Subdomain, das passt. Unter demselben Namen darf aber kein anderer Eintrag existieren.

### Deine Domain nutzt eigene Nameserver

Liegt deine DNS-Zone nicht bei STRATO, du verschickst aber über STRATO, musst du die DKIM-Einträge selbst pflegen. STRATO nennt dafür zwei CNAME-Einträge, die du bei deinem DNS-Anbieter anlegst:

| Hostname | Zeigt auf |
|---|---|
| `strato-dkim-0002._domainkey` | `strato-dkim-0002._domainkey.rzone.de` |
| `strato-dkim-0003._domainkey` | `strato-dkim-0003._domainkey.rzone.de` |

Achtung: STRATO wechselt diese Selektoren in Abständen. Prüf deshalb regelmäßig mit einer Testmail, ob deine Mails noch unterschrieben sind.

## Sonderfall: Ein weiterer Dienst verschickt Mails für dich

Das ist der wichtigste Fall. STRATO unterschreibt nur Mails, die über STRATO-Server laufen. Jeder andere Dienst muss selbst mit deiner Domain unterschreiben, und dafür braucht er eigene Einträge in deinem STRATO-DNS.

**Newsletter-Tool:** Dienste wie Brevo, Mailchimp oder CleverReach zeigen dir unter „Domain authentifizieren“ ein bis drei Einträge an. Trag sie unter **TXT- und CNAME-Records** genau so ein und bestätige danach im Newsletter-Tool, dass die Domain eingerichtet ist. Die STRATO-Signatur bleibt davon unberührt.

**Microsoft 365 auf deiner STRATO-Domain:** Microsoft unterschreibt ohne Einrichtung nur mit `*.onmicrosoft.com`. Für deine Domain aktivierst du DKIM im Defender-Portal unter **E-Mail & Zusammenarbeit**, **Richtlinien & Regeln**, **Bedrohungsrichtlinien**, **E-Mail-Authentifizierungseinstellungen**, Reiter **DKIM**. Microsoft zeigt dir zwei CNAME-Einträge (`selector1._domainkey` und `selector2._domainkey`). Leg beide bei STRATO an und schalte dann im Portal **Nachrichten für diese Domäne mit DKIM-Signaturen signieren** ein.

**Kontaktformular:** Verschickt dein Formular per SMTP über dein STRATO-Postfach, unterschreibt STRATO automatisch. Über den Webserver eines anderen Hosters fehlt die Signatur oft. Stell das Formular deshalb auf SMTP über `smtp.strato.de` um.

## Danach testen

Laut STRATO können DNS-Änderungen bis zu 24 Stunden dauern. Schick nach ein paar Stunden aus jedem Dienst eine Testmail über den [Mail-Test](/). So siehst du, ob jede Mail eine gültige Unterschrift mit deiner Domain trägt.

Weiter geht es mit [SPF-Eintrag bei STRATO setzen](/anleitung/strato/spf) und [DMARC bei STRATO einrichten](/anleitung/strato/dmarc). Andere Anbieter findest du in der [Übersicht der Anleitungen](/anleitung).

## Typische Fehler und Lösungen

| Meldung | Bedeutung | Lösung |
|---|---|---|
| Keine DKIM-Signatur | Mail lief nicht über STRATO, z. B. aus einem Newsletter-Tool. | DKIM im Dienst einrichten und seine Einträge bei STRATO anlegen. |
| Signatur passt nicht zur Domain | Unterschrieben mit fremder Domain, z. B. `onmicrosoft.com`. | DKIM für deine eigene Domain im Dienst aktivieren. |
| Präfix wird nicht angenommen | Großbuchstaben, Umlaute oder Domain im Präfix. | Nur den vorderen Teil in Kleinbuchstaben eintragen. |
| DKIM plötzlich ungültig | STRATO hat den Selektor gewechselt (bei eigenen Nameservern). | Aktuelle Selektoren bei STRATO nachschlagen und CNAMEs anpassen. |
