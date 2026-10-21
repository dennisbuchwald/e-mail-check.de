---
titel: "SPF-Eintrag bei STRATO setzen: die richtige Regel wählen"
seoTitel: "STRATO SPF-Eintrag setzen: Anleitung für Einsteiger"
beschreibung: "Welche SPF-Regel du bei STRATO wählen solltest und wie du einen eigenen SPF-Eintrag für externe Versender richtig anlegst."
keyword: "strato spf-eintrag"
anbieter: "strato"
anbieterName: "STRATO"
themen: ["spf"]
dauer: "10 Minuten"
kurzantwort: "Bei STRATO wählst du die SPF-Regel in den DNS-Einstellungen deiner Domain aus einer Liste. Verschickst du nur über STRATO, reicht laut STRATO in den meisten Fällen die Voreinstellung. Einen eigenen SPF-Eintrag brauchst du, sobald ein externer Dienst wie ein Newsletter-Tool oder Microsoft 365 in deinem Namen verschickt."
schritte:
  spf:
    - text: "Im STRATO Kunden-Login **Domains** und dann **Domainverwaltung** öffnen."
    - text: "Bei deiner Domain auf das **Zahnrad** klicken und den Reiter **DNS** wählen."
    - text: "Nur STRATO-Mail? Die SPF-Regel auf der Voreinstellung lassen. Externer Versender? Eine eigene TXT-Regel anlegen."
    - text: "Eigene Regel: Präfix leer lassen, als **Wert** alle Versender in einen Eintrag schreiben. Das include des Newsletter-Tools aus dessen Hilfe ergänzen."
      eintrag:
        typ: "TXT"
        host: "@"
        wert: "v=spf1 include:_spf.strato.com ~all"
    - text: "Speichern und bis zu 24 Stunden warten, dann mit einer Testmail prüfen."
faq:
  - frage: "Welche SPF-Regel soll ich bei STRATO wählen?"
    antwort: "Verschickst du ausschließlich über STRATO, reicht laut STRATO meist die Voreinstellung. Sobald ein externer Dienst in deinem Namen verschickt, brauchst du eine eigene SPF-Regel, in der STRATO und der externe Dienst gemeinsam stehen."
  - frage: "Was passiert, wenn ich zwei SPF-Einträge habe?"
    antwort: "Dann ist SPF ungültig, und Empfänger werten deine Domain so, als hätte sie keinen SPF-Eintrag. Pro Domain ist nur ein SPF-Eintrag erlaubt. Alle Versender gehören in diesen einen Eintrag."
  - frage: "Wie lange dauert es, bis der SPF-Eintrag bei STRATO wirkt?"
    antwort: "Laut STRATO können Änderungen an DNS-Einträgen bis zu 24 Stunden dauern. Teste nach ein paar Stunden und notfalls am nächsten Tag noch einmal."
  - frage: "Was ist der Unterschied zwischen Fail und Softfail bei STRATO?"
    antwort: "Fail weist Empfänger an, Mails von nicht genannten Servern abzulehnen. Softfail markiert sie nur als verdächtig und wird laut STRATO meist zum Testen genutzt. Fail empfiehlt STRATO vor allem, wenn du einen eigenen Mailserver betreibst."
quelle:
  - titel: "STRATO FAQ: Wie kann ich bei STRATO meine DNS-Einträge verwalten?"
    url: "https://www.strato.de/faq/domains/wie-kann-ich-bei-strato-meine-dns-eintraege-verwalten/"
  - titel: "STRATO FAQ: DMARC bei STRATO aktivieren"
    url: "https://www.strato.de/faq/hosting/dmarc-bei-strato-aktivieren/"
stand: "2026-10-21"
geprueft: false
offenePunkte:
  - "Oberfläche prüfen: Welche Optionen bietet das SPF-Dropdown genau (Keine STRATO SPF-Regel, Standard STRATO Mailserver, Fail, Softfail, eigene Regel) und welchen Wert erzeugt jede? Die FAQ widerspricht sich, ob Keine STRATO SPF-Regel oder Standard STRATO Mailserver die empfohlene Voreinstellung ist."
  - "Den kombinierten Wert v=spf1 include:_spf.strato.com include:… ~all nennt STRATO nicht. Die FAQ nennt nur v=spf1 redirect=_spf.strato.com (bei eigenen Nameservern). Gegen die Oberfläche bzw. den STRATO-Support prüfen, welcher kombinierte Wert für externe Versender richtig ist."
  - "Oberfläche prüfen: Wird eine eigene SPF-Regel über das SPF-Feld oder über TXT- und CNAME-Records angelegt?"
---

## Vorher prüfen: Was steht gerade in deinem SPF?

Gib deine Domain im [SPF-Check](/spf-check) ein. Du siehst, ob ein SPF-Eintrag existiert, welche Server er erlaubt und ob es versehentlich zwei Einträge gibt. Das ist wichtig, bevor du bei STRATO eine andere Regel auswählst.

Noch genauer ist eine echte Mail: Schick über den [Mail-Test](/) eine Testmail aus deinem STRATO-Postfach. Unter **Absender bestätigt** siehst du, ob SPF für genau diese Mail passt. Die Grundlagen findest du in [SPF einfach erklärt](/wissen/spf).

## Schritt für Schritt: SPF-Regel bei STRATO einstellen

1. Melde dich im STRATO Kunden-Login an.
2. Öffne **Domains** und dann **Domainverwaltung**.
3. Klick bei deiner Domain auf das **Zahnrad** und wähle den Reiter **DNS**.
4. Such den Bereich für die SPF-Regel. STRATO bietet dort mehrere Optionen an:

| Option | Wofür |
|---|---|
| Keine STRATO SPF-Regel | Laut STRATO für die meisten Fälle ausreichend. |
| Standard STRATO Mailserver | Regel für den Versand über die STRATO-Mailserver. |
| Fail | Nicht genannte Server werden abgelehnt. Empfohlen bei eigenem Mailserver. |
| Softfail | Nicht genannte Server gelten nur als verdächtig. Meist zum Testen. |
| Eigene Regel | Freier TXT-Eintrag mit Präfix und Wert. |

5. Verschickst du nur über STRATO, lässt du die Voreinstellung stehen.
6. Speichere deine Auswahl. Änderungen können bis zu 24 Stunden dauern.

Die genaue Beschriftung kann in deinem Kunden-Login leicht abweichen. Entscheidend ist: Ohne externe Versender musst du hier meist nichts ändern.

## Sonderfall: Ein weiterer Dienst verschickt Mails für dich

Hier lohnt sich die Arbeit. STRATO deckt nur seine eigenen Server ab. Verschickt ein anderer Dienst Mails mit deiner Absenderadresse, muss er ebenfalls im SPF stehen:

- ein **Newsletter-Tool** wie Brevo, Mailchimp oder CleverReach,
- **Microsoft 365** oder **Google Workspace** auf deiner STRATO-Domain,
- ein **Kontaktformular**, das über einen fremden Server verschickt.

Dafür legst du eine eigene SPF-Regel an, in der alle Versender gemeinsam stehen. Das Feld **Präfix** lässt du leer, damit die Regel für deine Hauptdomain gilt. STRATO ergänzt den Domainnamen automatisch. Im Feld **Wert** steht dann zum Beispiel:

```
v=spf1 include:_spf.strato.com include:spf.dein-newsletter-tool.example ~all
```

Den `include`-Wert deines Newsletter-Tools findest du in dessen Hilfe, meist unter „Domain authentifizieren“. Für Microsoft 365 lautet er laut Microsoft `include:spf.protection.outlook.com`, für Google Workspace laut Google `include:_spf.google.com`.

Wichtig dabei:

- **Nur ein SPF-Eintrag.** Lege keinen zusätzlichen TXT-Eintrag mit `v=spf1` an, wenn bereits einer existiert. Führe alles in einer Regel zusammen.
- **STRATO nicht vergessen.** Verschickst du weiterhin auch aus deinem STRATO-Postfach, muss STRATO in der eigenen Regel stehen bleiben.
- **Höchstens 10 Abfragen.** Jedes `include` zählt. Der [SPF-Check](/spf-check) zeigt dir, wie viele du verbrauchst.

**Kontaktformular:** Am einfachsten verschickt dein Formular per SMTP über dein STRATO-Postfach (`smtp.strato.de`), bei WordPress zum Beispiel mit einem SMTP-Plugin. Dann ist die Mail schon durch STRATO abgedeckt.

## Danach testen

Warte nach dem Speichern ein paar Stunden, im Zweifel bis zu 24 Stunden. Schick dann über den [Mail-Test](/) eine Testmail aus jedem Dienst, den du nutzt, also aus dem STRATO-Postfach und zum Beispiel einen Test-Newsletter. So siehst du, ob jeder Versender bestätigt ist.

Danach kommen die anderen beiden Bausteine: [DKIM bei STRATO einrichten](/anleitung/strato/dkim) und [DMARC bei STRATO einrichten](/anleitung/strato/dmarc). Alle Anbieter findest du in der [Übersicht der Anleitungen](/anleitung).

## Typische Fehler und Lösungen

| Meldung | Bedeutung | Lösung |
|---|---|---|
| Mehrere SPF-Einträge | Neben der STRATO-Regel existiert ein zweiter `v=spf1`-Eintrag. | Alles in einer eigenen Regel zusammenführen. |
| SPF fail oder softfail | Der versendende Dienst steht nicht im Eintrag. | Dessen `include` in die eigene Regel aufnehmen. |
| STRATO-Mails fallen plötzlich durch | Bei der eigenen Regel wurde STRATO vergessen. | STRATO wieder in den Eintrag aufnehmen. |
| Zu viele DNS-Abfragen | Mehr als 10 Abfragen durch viele includes. | Ungenutzte Dienste entfernen, Newsletter eventuell über eine Subdomain. |
