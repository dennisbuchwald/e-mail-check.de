---
titel: "SPF-Eintrag bei ALL-INKL setzen: im KAS bearbeiten und ergänzen"
seoTitel: "ALL-INKL SPF-Eintrag setzen: Anleitung mit Beispiel"
beschreibung: "So bearbeitest du bei ALL-INKL den SPF-Eintrag im KAS und ergänzt weitere Versender, ohne den Standard-Eintrag zu zerstören."
keyword: "all-inkl spf-eintrag"
anbieter: "all-inkl"
anbieterName: "ALL-INKL"
themen: ["spf"]
dauer: "5 Minuten"
kurzantwort: "Bei ALL-INKL ist SPF für Mails über den ALL-INKL-Mailserver standardmäßig eingerichtet. Du musst nur etwas tun, wenn ein weiterer Dienst wie ein Newsletter-Tool oder Microsoft 365 in deinem Namen verschickt. Dann bearbeitest du den vorhandenen SPF-Eintrag im KAS, statt einen zweiten anzulegen."
schritte:
  spf:
    - text: "Im KAS unter **Tools** die **DNS-Einstellungen** öffnen und deine Domain bearbeiten."
    - text: "Den vorhandenen SPF-Eintrag (Typ **TXT (SPF)**) bearbeiten. Nur wenn keiner existiert: **neuen DNS-Eintrag erstellen**."
    - text: "Name leer lassen, Typ **TXT (SPF)**, Prio 0. Bei **Data** den Wert eintragen und das include weiterer Versender vor ~all ergänzen."
      eintrag:
        typ: "TXT"
        host: "@"
        wert: "v=spf1 a mx include:spf.kasserver.com ~all"
    - text: "Auf **speichern** klicken. Nicht **Zone zurücksetzen** nutzen, das löscht alle Zusatzeinträge."
    - text: "Einige Stunden warten, dann mit einer Testmail prüfen."
faq:
  - frage: "Ist SPF bei ALL-INKL automatisch aktiv?"
    antwort: "Ja, für den Versand über den ALL-INKL-Mailserver ist SPF standardmäßig angelegt. Der Standardwert lautet v=spf1 a mx include:spf.kasserver.com ~all. Anpassen musst du ihn nur für zusätzliche Versender."
  - frage: "Was passiert, wenn ich zwei SPF-Einträge habe?"
    antwort: "Dann ist SPF ungültig, und Empfänger behandeln deine Domain, als gäbe es keinen Eintrag. ALL-INKL erlaubt ohnehin nur einen SPF-Eintrag pro Domain. Alle Versender gehören in diesen einen Eintrag."
  - frage: "Was macht Zone zurücksetzen im KAS?"
    antwort: "Es stellt die Standard-DNS-Einstellungen wieder her und legt den Standard-SPF an. Dabei werden aber alle Einträge gelöscht, die du zusätzlich angelegt hast, etwa DKIM-Einträge eines Newsletter-Tools oder dein DMARC-Eintrag."
  - frage: "Wie lange dauert es, bis der SPF-Eintrag bei ALL-INKL wirkt?"
    antwort: "ALL-INKL nennt in der Anleitung keine Zeit. DNS-Änderungen brauchen erfahrungsgemäß einige Minuten bis wenige Stunden, bis sie überall sichtbar sind. Teste nach ein paar Stunden und notfalls am nächsten Tag noch einmal."
quelle:
  - titel: "ALL-INKL Anleitung: SPF"
    url: "https://all-inkl.com/wichtig/anleitungen/kas/tools/dns-werkzeuge/spf_482.html"
  - titel: "ALL-INKL Anleitung: DMARC (Hinweis auf vorkonfiguriertes SPF/DKIM)"
    url: "https://all-inkl.com/wichtig/anleitungen/kas/tools/dns-werkzeuge/dmarc_562.html"
stand: "2026-10-21"
geprueft: false
offenePunkte:
  - "Wartezeit: Die ALL-INKL-Anleitung nennt keine. Im KAS oder beim Support klären, wie schnell Änderungen wirken."
  - "Oberfläche prüfen: In welchen Tarifen erscheint die Meldung Diese DNS-Einstellungen sind in Ihrem Tarif leider nicht möglich, und kann man dann überhaupt eigene includes ergänzen?"
  - "Oberfläche prüfen: Wird der Standard-SPF im KAS als bearbeitbarer Eintrag angezeigt?"
---

## Vorher prüfen: Was steht in deinem SPF-Eintrag?

Gib deine Domain im [SPF-Check](/spf-check) ein. Du siehst, welcher Eintrag gerade gilt und welche Versender darin stehen. Bei ALL-INKL sieht der Standard so aus:

```
v=spf1 a mx include:spf.kasserver.com ~all
```

Ob deine echten Mails SPF bestehen, zeigt eine Testmail. Schick über den [Mail-Test](/) eine Mail aus deinem ALL-INKL-Postfach und schau unter **Absender bestätigt** nach. Die Grundlagen findest du in [SPF einfach erklärt](/wissen/spf).

## Schritt für Schritt: SPF-Eintrag im KAS bearbeiten

1. Melde dich im KAS (technische Verwaltung) unter `kas.all-inkl.com` an.
2. Öffne **Tools** und dann **DNS-Einstellungen**. Bearbeite die gewünschte Domain.
3. Pro Domain ist nur ein SPF-Eintrag erlaubt. Gibt es schon einen, bearbeite ihn. Gibt es keinen, klick auf **neuen DNS-Eintrag erstellen**.
4. Füll die Felder so aus:

| Feld | Inhalt |
|---|---|
| Name | leer lassen |
| Typ | TXT (SPF) |
| Prio | 0 |
| Data | dein SPF-Wert |

5. Klick auf **speichern**. Der Eintrag erscheint danach in der Tabelle.

Zeigt das KAS den Hinweis „Diese DNS-Einstellungen sind in Ihrem Tarif leider nicht möglich“, bietet ALL-INKL den Knopf **Zone zurücksetzen** an. Er setzt den Standard-SPF. Lies vorher den Warnhinweis weiter unten.

Kurz zum Aufbau des Werts: `a` und `mx` erlauben die Server deiner Domain, `include:spf.kasserver.com` erlaubt die ALL-INKL-Mailserver, und `~all` markiert alle anderen als verdächtig.

## Sonderfall: Ein weiterer Dienst verschickt Mails für dich

Das ist der Grund, warum du überhaupt hier bist. Der Standard-SPF deckt nur ALL-INKL ab. Verschickt ein anderer Dienst mit deiner Absenderadresse, muss er im selben Eintrag stehen:

- ein **Newsletter-Tool** wie Brevo, Mailchimp oder CleverReach,
- **Microsoft 365** oder **Google Workspace** auf deiner ALL-INKL-Domain,
- ein **Kontaktformular** auf einem anderen Server.

Du ergänzt dafür ein `include` vor dem `~all` im bestehenden Eintrag. Beispiel mit einem Newsletter-Tool:

```
v=spf1 a mx include:spf.kasserver.com include:spf.dein-newsletter-tool.example ~all
```

Den passenden `include`-Wert findest du in der Hilfe deines Dienstes, meist unter „Domain authentifizieren“. Für Microsoft 365 lautet er laut Microsoft `include:spf.protection.outlook.com`, für Google Workspace laut Google `include:_spf.google.com`.

Drei Regeln, damit nichts kaputtgeht:

- **Bearbeiten, nicht neu anlegen.** Ein zweiter TXT (SPF)-Eintrag macht SPF ungültig.
- **`include:spf.kasserver.com` stehen lassen,** solange du noch über ALL-INKL verschickst.
- **Höchstens 10 Abfragen.** Jedes `include` zählt, auch `a` und `mx`. Der [SPF-Check](/spf-check) zählt für dich mit.

**Kontaktformular auf deiner ALL-INKL-Website:** Verschickt es per SMTP über dein ALL-INKL-Postfach (bei WordPress zum Beispiel mit einem SMTP-Plugin), ist es schon abgedeckt.

### Vorsicht mit „Zone zurücksetzen“

Der Knopf stellt die Standard-DNS-Einstellungen wieder her. Dabei löscht er alle Einträge, die du selbst angelegt hast: das ergänzte `include`, DKIM-Einträge deines Newsletter-Tools und deinen DMARC-Eintrag. Notier dir vorher alle Zusatzeinträge, wenn du ihn trotzdem nutzt.

## Danach testen

Warte nach dem Speichern ein paar Stunden. Schick dann über den [Mail-Test](/) aus jedem Dienst eine Testmail, aus deinem ALL-INKL-Postfach und zum Beispiel einen Test-Newsletter. So siehst du, ob jeder Versender bestätigt ist. Fällt nur ein Dienst durch, stimmt meist sein `include` nicht: Vergleich den Wert Zeichen für Zeichen mit der Hilfe des Dienstes und prüf, ob er vor dem `~all` steht.

Weiter geht es mit [DKIM bei ALL-INKL einrichten](/anleitung/all-inkl/dkim) und [DMARC bei ALL-INKL einrichten](/anleitung/all-inkl/dmarc). Andere Anbieter findest du in der [Übersicht der Anleitungen](/anleitung).

## Typische Fehler und Lösungen

| Meldung | Bedeutung | Lösung |
|---|---|---|
| Mehrere SPF-Einträge | Ein zweiter TXT (SPF)-Eintrag wurde angelegt. | Beide zusammenführen, den zweiten löschen. |
| SPF fail oder softfail | Der versendende Dienst fehlt im Eintrag. | Sein `include` vor `~all` ergänzen. |
| Zusatzeinträge verschwunden | Die Zone wurde zurückgesetzt. | Fehlende Einträge (SPF-Ergänzung, DKIM, DMARC) neu anlegen. |
| Zu viele DNS-Abfragen | Mehr als 10 Abfragen. | Ungenutzte Dienste entfernen, Newsletter eventuell über eine Subdomain. |
