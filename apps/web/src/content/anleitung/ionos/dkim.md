---
titel: "DKIM bei IONOS einrichten: prüfen, aktivieren, ergänzen"
seoTitel: "IONOS DKIM einrichten: Schritt für Schritt erklärt"
beschreibung: "So prüfst und aktivierst du DKIM bei IONOS. Auch wenn deine Domain woanders liegt oder du Microsoft 365 oder ein Newsletter-Tool nutzt."
keyword: "ionos dkim"
anbieter: "ionos"
anbieterName: "IONOS"
themen: ["dkim"]
dauer: "10 Minuten"
kurzantwort: "Bei IONOS ist DKIM für eigene Mails automatisch aktiv, solange deine Domain die IONOS-Nameserver nutzt. Du musst nur etwas tun, wenn die DKIM-Einträge gelöscht wurden, deine DNS-Zone bei einem anderen Anbieter liegt oder ein weiterer Dienst wie Microsoft 365 oder ein Newsletter-Tool in deinem Namen verschickt."
schritte:
  dkim:
    - text: "Im IONOS Konto die **DNS**-Einstellungen deiner Domain öffnen (drei Punkte bei der Domain)."
    - text: "**Record hinzufügen** wählen, Typ **CNAME**, dann diesen Eintrag in **Hostname** und **Zeigt auf** eintragen und speichern."
      eintrag:
        typ: "CNAME"
        host: "s1-ionos._domainkey"
        wert: "s1.dkim.ionos.com"
    - text: "Den zweiten CNAME genauso anlegen."
      eintrag:
        typ: "CNAME"
        host: "s2-ionos._domainkey"
        wert: "s2.dkim.ionos.com"
    - text: "Den dritten CNAME aus der IONOS-Hilfe ebenso anlegen."
      eintrag:
        typ: "CNAME"
        host: "s42582890._domainkey"
        wert: "s42582890.dkim.ionos.com"
    - text: "Etwa eine Stunde warten, dann mit einer Testmail prüfen, ob deine Mail unterschrieben ist."
faq:
  - frage: "Ist DKIM bei IONOS automatisch aktiv?"
    antwort: "Ja, wenn deine Domain die IONOS-Nameserver nutzt, legt IONOS die DKIM-Einträge selbst an. Manuell eingreifen musst du nur, wenn die Einträge fehlen oder deine DNS-Zone bei einem anderen Anbieter liegt."
  - frage: "Warum findet ein DKIM-Check bei meiner IONOS-Domain nichts?"
    antwort: "Viele Prüftools brauchen den Selektor, also den Namen vor ._domainkey. Bei IONOS heißen die Selektoren s1-ionos, s2-ionos und s42582890. Unser DKIM-Check sucht danach automatisch, am sichersten ist aber eine echte Testmail."
  - frage: "Wie lange dauert es, bis DKIM bei IONOS wirkt?"
    antwort: "IONOS setzt die TTL der Einträge auf eine Stunde. Rechne also mit etwa einer Stunde, bis die Einträge überall sichtbar sind. Liegt deine Zone bei einem anderen Anbieter, kann es länger dauern."
  - frage: "Brauche ich DKIM bei IONOS, wenn ich Microsoft 365 nutze?"
    antwort: "Ja, aber dann von Microsoft. IONOS-DKIM unterschreibt nur Mails, die über IONOS-Server gehen. Für Microsoft 365 legst du die zwei CNAME-Einträge aus dem Defender-Portal in deinem IONOS-DNS an und aktivierst danach den Schalter bei Microsoft."
quelle:
  - titel: "IONOS Hilfe: E-Mail-Authentifizierung mit DKIM"
    url: "https://www.ionos.de/hilfe/domains/mailserver-und-verwandte-records-konfigurieren/e-mail-authentifizierung-mit-dkim/"
  - titel: "IONOS Hilfe: Microsoft 365 DKIM-Eintrag im Defender-Portal erstellen"
    url: "https://www.ionos.de/hilfe/office/microsoft-365-einrichten/microsoft-365-dkim-eintrag-fuer-eine-domain-im-microsoft-365-defender-portal-erstellen/"
  - titel: "Microsoft Learn: DKIM für eigene Domains konfigurieren"
    url: "https://learn.microsoft.com/de-de/defender-office-365/email-authentication-dkim-configure"
stand: "2026-10-21"
geprueft: false
offenePunkte:
  - "Dritter CNAME: Per DNS (21.10.2026) steht s42582890._domainkey → s42582890.dkim.ionos.com bei 4 unabhängigen IONOS-Domains identisch (kein Wildcard), ist also nicht kundenspezifisch. Die IONOS-Hilfe erklärt die Nummer nicht. Falls IONOS sie wechselt, Anleitung anpassen."
  - "Menüname prüfen: Die IONOS-Hilfe schreibt teils Domain & SSL, teils Domains & SSL."
  - "Schalter zum Reaktivieren: Die IONOS-Hilfe nennt keinen, nur das Anlegen der drei CNAMEs. In der Oberfläche prüfen, ob es zusätzlich einen Schalter gibt."
---

## Vorher prüfen: Sind deine Mails schon unterschrieben?

Meist ist bei IONOS schon alles richtig, und du musst gar nichts tun. Prüf das zuerst. Am zuverlässigsten ist eine echte Mail: Schick über den [Mail-Test](/) eine Nachricht aus deinem IONOS-Postfach. Unter **Mail unterschrieben** siehst du, ob die DKIM-Signatur gültig ist und zu deiner Domain passt.

Ohne Testmail geht es mit dem [DKIM-Check](/dkim-check). Er sucht automatisch nach den IONOS-Selektoren `s1-ionos`, `s2-ionos` und `s42582890`. Was DKIM genau ist, liest du in [DKIM einfach erklärt](/wissen/dkim).

## Schritt für Schritt: DKIM-Einträge bei IONOS wiederherstellen

Nutzt deine Domain die IONOS-Nameserver (das ist der Standard), legt IONOS die DKIM-Einträge selbst an. Fehlen sie, weil jemand die DNS-Zone aufgeräumt hat, legst du sie so neu an:

1. Öffne im IONOS Konto die DNS-Einstellungen deiner Domain. Das geht über **Domain & SSL**, die drei Punkte bei der Domain und **DNS**.
2. Klick auf **Record hinzufügen** und wähle **CNAME**.
3. Trag in die Felder **Hostname** und **Zeigt auf** die Werte aus der Tabelle ein.
4. Die TTL ist auf 1 Stunde voreingestellt. Lass sie so.
5. Klick auf **Speichern**.
6. Wiederhole das für die anderen Einträge.

| Hostname | Zeigt auf |
|---|---|
| `s1-ionos._domainkey` | `s1.dkim.ionos.com` |
| `s2-ionos._domainkey` | `s2.dkim.ionos.com` |
| `s42582890._domainkey` | `s42582890.dkim.ionos.com` |

Der dritte Eintrag sieht aus wie eine Kundennummer, ist aber für alle IONOS-Kunden gleich: Wir haben ihn bei mehreren IONOS-Domains identisch gefunden. Für eine Subdomain hängst du deren Namen an, zum Beispiel `s1-ionos._domainkey.blog` für `blog.deine-domain.de`.

### Deine DNS-Zone liegt bei einem anderen Anbieter

Du nutzt IONOS-Postfächer, die Domain zeigt aber auf fremde Nameserver? Dann legt IONOS nichts automatisch an. Trag die drei CNAME-Einträge aus der Tabelle bei deinem DNS-Anbieter ein. Die Bedienung sieht dort anders aus, die Werte bleiben gleich.

## Sonderfall: Ein weiterer Dienst verschickt Mails für dich

Hier scheitert DKIM am häufigsten. IONOS unterschreibt nur Mails, die über IONOS-Server laufen. Jeder andere Dienst braucht seine eigene Unterschrift mit deiner Domain.

**Microsoft 365 auf deiner IONOS-Domain:** Microsoft unterschreibt ohne Einrichtung nur mit der Adresse `*.onmicrosoft.com`. Für deine Domain musst du DKIM selbst aktivieren:

1. Melde dich im Defender-Portal unter `security.microsoft.com` als Administrator an.
2. Öffne **Richtlinien und Regeln**, dann **Bedrohungsrichtlinien** und **E-Mail-Authentifizierungseinstellungen**, Reiter **DKIM**.
3. Klick auf deine Domain. Erscheint kein Schalter, wähle **DKIM-Schlüssel erstellen**. Kopiere die zwei angezeigten CNAME-Einträge (`selector1._domainkey` und `selector2._domainkey`).
4. Leg beide im IONOS-DNS als **CNAME** an, so wie oben beschrieben. Den Zielwert trägst du ohne `https://` ein.
5. Geh zurück ins Defender-Portal und schalte **Nachrichten für diese Domäne mit DKIM-Signaturen signieren** ein.

Meldet Microsoft einen fehlenden CNAME, warte bis zu einer Stunde und versuch es erneut. Prüf auch, ob beim Kopieren Leerzeichen mitgerutscht sind.

**Newsletter-Tool:** Dienste wie Brevo, Mailchimp oder CleverReach zeigen dir unter „Domain authentifizieren“ eigene DKIM-Einträge. Leg sie genau so im IONOS-DNS an (meist CNAME, manchmal TXT). Die IONOS-Einträge bleiben dabei unverändert, mehrere DKIM-Einträge vertragen sich problemlos.

**Kontaktformular:** Verschickt dein Formular per SMTP über ein IONOS-Postfach, unterschreibt IONOS automatisch. Verschickt es direkt über den Webserver, fehlt die Signatur oft. Stell das Formular deshalb auf SMTP um.

## Danach testen

Warte etwa eine Stunde und schick dann eine Testmail über den [Mail-Test](/), aus jedem Dienst, den du nutzt. So siehst du, ob wirklich jede Mail unterschrieben ist. Der [DKIM-Check](/dkim-check) zeigt dir zusätzlich, ob die Einträge im DNS sichtbar sind.

Danach geht es mit den anderen beiden Bausteinen weiter: [SPF-Eintrag bei IONOS setzen](/anleitung/ionos/spf) und [DMARC bei IONOS einrichten](/anleitung/ionos/dmarc). Andere Anbieter findest du in der [Übersicht der Anleitungen](/anleitung).

## Typische Fehler und Lösungen

| Meldung | Bedeutung | Lösung |
|---|---|---|
| Keine DKIM-Signatur | Die Mail wurde nicht unterschrieben, meist bei Fremddiensten. | DKIM im jeweiligen Dienst aktivieren und dessen Einträge im IONOS-DNS anlegen. |
| Signatur passt nicht zur Domain | Unterschrieben wurde mit einer fremden Domain, z. B. `onmicrosoft.com`. | DKIM für deine eigene Domain im Dienst einschalten. |
| Kein DKIM-Eintrag gefunden | Der Check kennt deinen Selektor nicht. | Mit einer Testmail prüfen, sie zeigt den echten Selektor. |
| CNAME lässt sich nicht speichern | Für denselben Hostnamen existiert schon ein Eintrag. | Alten Eintrag prüfen und gegebenenfalls ersetzen. |
