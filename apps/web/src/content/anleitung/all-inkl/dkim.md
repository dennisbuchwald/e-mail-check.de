---
titel: "DKIM bei ALL-INKL einrichten: Was automatisch läuft und was du im KAS tust"
seoTitel: "ALL-INKL DKIM einrichten: Anleitung für das KAS"
beschreibung: "DKIM bei ALL-INKL: Was automatisch läuft und wie du im KAS einen DKIM-Eintrag für externe Mailserver und Newsletter-Tools anlegst."
keyword: "all-inkl dkim"
anbieter: "all-inkl"
anbieterName: "ALL-INKL"
themen: ["dkim"]
dauer: "10 Minuten"
kurzantwort: "Bei ALL-INKL ist DKIM für Mails über den eigenen ALL-INKL-Mailserver standardmäßig eingerichtet. Du musst nur etwas tun, wenn ein externer Mailserver oder Dienst in deinem Namen verschickt, etwa ein Newsletter-Tool oder Microsoft 365. Dann legst du dessen DKIM-Eintrag im KAS an."
schritte:
  dkim:
    - text: "Prüfen, ob die Mail über den ALL-INKL-Mailserver geht. Dann ist DKIM schon aktiv und du musst nichts tun."
    - text: "Für externe Dienste im KAS unter **Tools** die **DNS-Einstellungen** öffnen, die Domain bearbeiten und **neuen DNS-Eintrag erstellen** wählen."
    - text: "Bei **Name** den Selektor des Dienstes mit **._domainkey** eintragen, z. B. **mail._domainkey**. Typ **TXT**, Prio leer lassen."
    - text: "Bei **Data** den öffentlichen Schlüssel des Dienstes eintragen (beginnt mit **v=DKIM1;**) und speichern."
    - text: "Verlangt dein Dienst einen CNAME statt TXT, den Eintrag genau so anlegen, wie der Dienst ihn anzeigt. Danach mit einer Testmail prüfen."
faq:
  - frage: "Ist DKIM bei ALL-INKL automatisch aktiv?"
    antwort: "Ja, für den Versand über den ALL-INKL-Mailserver sind SPF und DKIM laut ALL-INKL standardmäßig angelegt. Eine eigene Anleitung zum Aktivieren gibt es nicht, weil es nicht nötig ist."
  - frage: "Wann brauche ich bei ALL-INKL einen eigenen DKIM-Eintrag?"
    antwort: "Nur wenn ein externer Mailserver Mails mit deiner Domain verschickt, zum Beispiel ein Newsletter-Tool oder Microsoft 365. Dieser Dienst erzeugt den Schlüssel, du trägst nur den öffentlichen Teil im KAS ein."
  - frage: "Wie lang darf ein DKIM-Schlüssel im KAS sein?"
    antwort: "Das Feld Data fasst laut ALL-INKL bis zu 512 Zeichen. Das reicht für Schlüssel bis 2048 Bit, die heute üblich sind."
  - frage: "Was passiert mit meinem DKIM-Eintrag bei Zone zurücksetzen?"
    antwort: "Er wird gelöscht. Zone zurücksetzen stellt die Standard-Einstellungen her und entfernt alle Einträge, die du selbst angelegt hast. Danach musst du den DKIM-Eintrag deines Dienstes neu anlegen."
quelle:
  - titel: "ALL-INKL Anleitung: DKIM bei Versand über externe Mailserver"
    url: "https://all-inkl.com/wichtig/anleitungen/kas/tools/dns-werkzeuge/dkim-bei-versand-ueber-externe-mailserver_444.html"
  - titel: "ALL-INKL Anleitung: DMARC (Hinweis auf vorkonfiguriertes SPF/DKIM)"
    url: "https://all-inkl.com/wichtig/anleitungen/kas/tools/dns-werkzeuge/dmarc_562.html"
  - titel: "Microsoft Learn: DKIM für eigene Domains konfigurieren"
    url: "https://learn.microsoft.com/de-de/defender-office-365/email-authentication-dkim-configure"
stand: "2026-10-21"
geprueft: false
offenePunkte:
  - "Oberfläche prüfen: Heißt der Typ im KAS TXT oder TXT (DKIM)? Die Recherche-Notiz nennt TXT (DKIM), die aktuelle Anleitung nur TXT."
  - "Welchen Selektor nutzt ALL-INKL für den eigenen Mailserver? Nicht dokumentiert, für den DKIM-Check (automatische Selektor-Suche) relevant."
  - "Oberfläche prüfen: Lassen sich im KAS CNAME-Einträge auf ._domainkey-Namen anlegen (für Microsoft 365 und viele Newsletter-Tools)?"
  - "Wartezeit: Die ALL-INKL-Anleitung nennt keine."
---

## Vorher prüfen: Sind deine Mails schon unterschrieben?

Verschickst du nur aus deinem ALL-INKL-Postfach, musst du meist gar nichts tun. Prüf das zuerst mit einer echten Mail: Schick über den [Mail-Test](/) eine Testmail und schau unter **Mail unterschrieben** nach. Dort siehst du, ob die Signatur gültig ist und zu deiner Domain passt.

Der [DKIM-Check](/dkim-check) prüft ohne Testmail, ob ein DKIM-Eintrag im DNS steht. Kennst du deinen Selektor nicht, sucht er automatisch nach verbreiteten Namen. Was DKIM genau ist, liest du in [DKIM einfach erklärt](/wissen/dkim).

## Schritt für Schritt: DKIM-Eintrag für einen externen Mailserver anlegen

Für den eigenen ALL-INKL-Mailserver ist nichts zu tun. Die folgenden Schritte brauchst du nur für externe Dienste. Der Dienst muss DKIM unterstützen und dir seinen öffentlichen Schlüssel anzeigen.

1. Melde dich im KAS (technische Verwaltung) unter `kas.all-inkl.com` an.
2. Öffne **Tools** und dann **DNS-Einstellungen**. Bearbeite deine Domain.
3. Klick auf **neuen DNS-Eintrag erstellen**.
4. Füll die Felder so aus:

| Feld | Inhalt |
|---|---|
| Name | Selektor des Dienstes plus `._domainkey`, z. B. `mail._domainkey` |
| Typ | TXT |
| Prio | leer lassen |
| Data | öffentlicher Schlüssel des Dienstes |

5. Speichere den Eintrag. Er erscheint danach in der Tabelle.

Der Wert im Feld **Data** sieht ungefähr so aus. Der Schlüssel hinter `p=` ist hier gekürzt, nimm immer den vollständigen Wert deines Dienstes:

```
v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA…
```

Das Feld fasst bis zu 512 Zeichen, genug für Schlüssel bis 2048 Bit. Achte beim Kopieren darauf, dass keine Leerzeichen oder Zeilenumbrüche mitrutschen.

## Sonderfall: Ein weiterer Dienst verschickt Mails für dich

Genau hier fehlt DKIM am häufigsten. ALL-INKL unterschreibt nur Mails, die über ALL-INKL laufen. Alle anderen Dienste brauchen ihren eigenen Eintrag.

**Newsletter-Tool:** Dienste wie Brevo, Mailchimp oder CleverReach zeigen dir unter „Domain authentifizieren“ ihre DKIM-Einträge an. Manche liefern einen TXT-Eintrag mit Schlüssel, dann gehst du wie oben vor. Andere liefern einen CNAME, der auf ihren Server zeigt. Dann legst du im KAS einen Eintrag vom Typ CNAME mit genau den angezeigten Werten an. Bestätige danach im Tool, dass die Domain eingerichtet ist.

**Microsoft 365 auf deiner ALL-INKL-Domain:** Microsoft unterschreibt ohne Einrichtung nur mit `*.onmicrosoft.com`. Für deine Domain aktivierst du DKIM im Defender-Portal unter **E-Mail & Zusammenarbeit**, **Richtlinien & Regeln**, **Bedrohungsrichtlinien**, **E-Mail-Authentifizierungseinstellungen**, Reiter **DKIM**. Microsoft zeigt dir zwei CNAME-Einträge (`selector1._domainkey` und `selector2._domainkey`). Leg beide im KAS an und schalte danach **Nachrichten für diese Domäne mit DKIM-Signaturen signieren** ein.

**Kontaktformular:** Verschickt es per SMTP über dein ALL-INKL-Postfach, unterschreibt ALL-INKL automatisch. Über einen fremden Server fehlt die Signatur meist. Stell es deshalb auf SMTP um.

Wichtig: Der Dienst muss zusätzlich im SPF-Eintrag stehen. Wie das geht, steht in [SPF-Eintrag bei ALL-INKL setzen](/anleitung/all-inkl/spf). Und Finger weg von **Zone zurücksetzen**: Der Knopf löscht alle selbst angelegten DKIM-Einträge.

## Danach testen

Warte ein paar Stunden und schick dann aus jedem Dienst eine Testmail über den [Mail-Test](/). So siehst du, ob jede Mail eine gültige Unterschrift mit deiner Domain trägt. Mit dem [DKIM-Check](/dkim-check) und dem Selektor deines Dienstes prüfst du zusätzlich, ob der Eintrag im DNS sichtbar ist.

Danach folgt die Schutzregel: [DMARC bei ALL-INKL einrichten](/anleitung/all-inkl/dmarc). Andere Anbieter findest du in der [Übersicht der Anleitungen](/anleitung).

## Typische Fehler und Lösungen

| Meldung | Bedeutung | Lösung |
|---|---|---|
| Keine DKIM-Signatur | Die Mail kam von einem externen Dienst ohne DKIM für deine Domain. | DKIM im Dienst einrichten und den Eintrag im KAS anlegen. |
| Signatur ungültig | Schlüssel unvollständig oder mit Leerzeichen kopiert. | Wert neu aus dem Dienst kopieren und ersetzen. |
| Signatur passt nicht zur Domain | Unterschrieben mit fremder Domain, z. B. `onmicrosoft.com`. | DKIM für deine eigene Domain im Dienst aktivieren. |
| DKIM-Eintrag verschwunden | Die Zone wurde zurückgesetzt. | Eintrag neu anlegen. |
