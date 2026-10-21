---
titel: "IONOS SPF-Eintrag setzen: So geht's Schritt für Schritt"
seoTitel: "IONOS SPF-Eintrag setzen: Anleitung mit Beispiel"
beschreibung: "So setzt du bei IONOS den richtigen SPF-Eintrag und ergänzt Newsletter-Tool oder Kontaktformular, ohne deine Mails zu blockieren."
keyword: "ionos spf eintrag"
anbieter: "ionos"
anbieterName: "IONOS"
themen: ["spf"]
dauer: "5 Minuten"
kurzantwort: "Bei IONOS ist SPF für Domains, die bei IONOS liegen, standardmäßig aktiv. Du musst nur etwas tun, wenn der Eintrag gelöscht wurde, deine DNS-Zone bei einem anderen Anbieter liegt oder ein weiterer Dienst (Newsletter-Tool, Microsoft 365, Kontaktformular) Mails in deinem Namen verschickt."
schritte:
  spf:
    - text: "Im IONOS Konto über das Menü **Domain & SSL** öffnen."
    - text: "Bei deiner Domain die drei Punkte anklicken und **DNS** wählen."
    - text: "Auf **Record hinzufügen** klicken und **IONOS SPF (TXT)** wählen, nicht das allgemeine **SPF (TXT)**."
    - text: "Mit **Speichern** bestätigen. Liegt deine DNS-Zone woanders, trägst du dort stattdessen diesen TXT-Eintrag ein."
      eintrag:
        typ: "TXT"
        host: "@"
        wert: "v=spf1 include:_spf-eu.ionos.com ~all"
    - text: "Bis zu 48 Stunden warten, dann mit einer Testmail prüfen."
faq:
  - frage: "Ist SPF bei IONOS automatisch aktiv?"
    antwort: "Ja, für Domains, die bei IONOS liegen, ist IONOS SPF standardmäßig eingerichtet. Prüfen musst du es trotzdem, wenn du Einträge geändert hast oder ein zusätzlicher Dienst Mails für dich verschickt."
  - frage: "Was passiert, wenn ich zwei SPF-Einträge habe?"
    antwort: "Dann ist SPF für deine Domain ungültig, und Empfänger behandeln deine Mails so, als gäbe es gar keinen Eintrag. Pro Domain darf es nur einen SPF-Eintrag geben. Alle Versender gehören in diesen einen Eintrag."
  - frage: "Wie lange dauert es, bis der SPF-Eintrag bei IONOS wirkt?"
    antwort: "Laut IONOS kann es bis zu 48 Stunden dauern, bis die Änderung weltweit verteilt ist. Oft geht es schneller. Teste am besten nach ein paar Stunden und notfalls am nächsten Tag noch einmal."
  - frage: "Welchen SPF-Wert brauche ich für IONOS bei einem anderen DNS-Anbieter?"
    antwort: "IONOS nennt dafür den Wert v=spf1 include:_spf-eu.ionos.com ~all als TXT-Eintrag für deine Domain. Gibt es dort schon einen SPF-Eintrag, ergänzt du nur das include, statt einen zweiten Eintrag anzulegen."
quelle:
  - titel: "IONOS Hilfe: Spam-Versand vermeiden mit SPF-Record"
    url: "https://www.ionos.de/hilfe/domains/mailserver-und-verwandte-records-konfigurieren/spam-versand-vermeiden-mit-spf-record/"
stand: "2026-10-21"
geprueft: false
offenePunkte:
  - "Standardwert per DNS belegt (5 Domains mit IONOS-Nameservern, 21.10.2026): v=spf1 include:_spf-eu.ionos.com ~all, TTL 1 Stunde. Offen: wie der Eintrag nach der automatischen Ergänzung eines fremden SPF aussieht (IONOS nennt kein Beispiel)."
  - "Bearbeiten laut IONOS-Hilfe möglich (SPF-Record in der DNS-Übersicht bearbeiten oder löschen). In der Oberfläche prüfen, ob dabei der Typ IONOS SPF (TXT) erhalten bleibt."
  - "Oberfläche prüfen: Steht im Feld Hostname für die Hauptdomain @ oder bleibt es leer? Die Hilfeseite nennt das Feld nicht."
  - "Menüname: Die IONOS-Hilfe schreibt im Text Domain & SSL, in den Bildunterschriften Domains & SSL."
---

## Vorher prüfen: Ist dein SPF-Eintrag schon da?

Bevor du etwas änderst, schau nach, was gerade eingetragen ist. Gib deine Domain im [SPF-Check](/spf-check) ein. Du siehst sofort, ob es einen Eintrag gibt, welche Versender darin stehen und ob es versehentlich zwei Einträge gibt.

Noch genauer ist eine echte Testmail: Schick über den [Mail-Test](/) eine Mail aus deinem IONOS-Postfach. Unter **Absender bestätigt** steht dann, ob SPF für genau diese Mail passt. Was SPF überhaupt macht, erklären wir in [SPF einfach erklärt](/wissen/spf).

## Schritt für Schritt: IONOS SPF aktivieren

IONOS richtet SPF für eigene Domains automatisch ein. Fehlt der Eintrag trotzdem, zum Beispiel weil er gelöscht wurde, stellst du ihn so wieder her:

1. Melde dich in deinem IONOS Konto an.
2. Öffne in der Titelleiste das Menü und wähle **Domain & SSL**. Du siehst die Übersicht deiner Domains.
3. Klick bei deiner Domain auf das Aktionsmenü mit den drei Punkten und wähle **DNS**.
4. Klick auf **Record hinzufügen**.
5. Wähle **IONOS SPF (TXT)**. Wichtig: nicht das allgemeine **SPF (TXT)**. Nur die IONOS-Variante setzt automatisch den passenden Wert.
6. Bestätige mit **Speichern**.

In der DNS-Übersicht erkennst du SPF-Einträge am Vermerk „SPF“. Ändere dort nur etwas, wenn du weißt, was du tust. Ein falscher Wert kann deinen ganzen Mailversand ausbremsen.

### Deine Domain liegt bei einem anderen DNS-Anbieter

Du nutzt IONOS-Postfächer, die DNS-Einstellungen liegen aber woanders, zum Beispiel bei Cloudflare oder deinem Webhoster? Dann legst du dort einen TXT-Eintrag für deine Domain an:

```
v=spf1 include:_spf-eu.ionos.com ~all
```

Das `~all` am Ende bedeutet: Mails von nicht genannten Servern sind verdächtig, werden aber nicht hart abgelehnt. Für den Start ist das die sichere Wahl.

## Sonderfall: Ein weiterer Dienst verschickt Mails für dich

Das ist der häufigste Grund, warum SPF bei IONOS-Kunden scheitert. Deine IONOS-Mails sind abgedeckt, aber ein anderer Dienst verschickt ebenfalls Mails mit deiner Absenderadresse:

- ein **Newsletter-Tool** wie Brevo, Mailchimp oder CleverReach,
- **Microsoft 365** oder **Google Workspace** auf deiner IONOS-Domain,
- ein **Kontaktformular** auf deiner Website, das über den Webserver verschickt.

Jeder dieser Dienste muss im SPF-Eintrag stehen, sonst gelten seine Mails als nicht bestätigt. Die Regel lautet: **ein einziger SPF-Eintrag, alle Versender darin.** Lege also keinen zweiten SPF-Eintrag an, sondern ergänze den bestehenden.

IONOS hilft dabei ein Stück: Gibt es schon einen SPF-Eintrag für einen anderen Dienst, ergänzt IONOS diesen beim Aktivieren von IONOS SPF automatisch. Einen vorhandenen IONOS-Eintrag kannst du laut IONOS in der DNS-Übersicht auch direkt bearbeiten. Ein kombinierter Eintrag sieht ungefähr so aus:

```
v=spf1 include:_spf-eu.ionos.com include:spf.dein-newsletter-tool.example ~all
```

Den genauen `include`-Wert findest du in der Hilfe deines Newsletter-Tools, meist unter „Domain authentifizieren“. Für Microsoft 365 lautet er laut Microsoft `include:spf.protection.outlook.com`.

**Kontaktformular:** Am einfachsten ist es, wenn dein Formular nicht über den Webserver, sondern per SMTP über dein IONOS-Postfach verschickt (bei WordPress zum Beispiel mit einem SMTP-Plugin). Dann ist die Mail bereits durch IONOS SPF abgedeckt und du musst nichts ergänzen.

Achte darauf, dass dein Eintrag nicht zu lang wird: SPF erlaubt höchstens 10 DNS-Abfragen. Jedes `include` zählt mit. Der [SPF-Check](/spf-check) zeigt dir, wie viele du verbrauchst.

## Danach testen

Nach dem Speichern kann es laut IONOS bis zu 48 Stunden dauern, bis der Eintrag überall wirkt. Schick danach eine Testmail über den [Mail-Test](/), am besten einmal aus dem IONOS-Postfach und einmal aus jedem weiteren Dienst, zum Beispiel einen Test-Newsletter an deine Testadresse. So siehst du, ob wirklich alle Versender bestätigt sind.

SPF allein reicht nicht. Prüfe als Nächstes, ob deine Mails unterschrieben sind: [DKIM bei IONOS einrichten](/anleitung/ionos/dkim). Danach folgt die Schutzregel: [DMARC bei IONOS einrichten](/anleitung/ionos/dmarc). Alle Anbieter findest du in der [Übersicht der Anleitungen](/anleitung).

## Typische Fehler und Lösungen

| Meldung | Bedeutung | Lösung |
|---|---|---|
| Kein SPF-Eintrag gefunden | Der Eintrag fehlt oder liegt beim falschen DNS-Anbieter. | IONOS SPF (TXT) wie oben anlegen oder den Wert beim tatsächlichen DNS-Anbieter eintragen. |
| Mehrere SPF-Einträge | Es gibt zwei TXT-Einträge, die mit `v=spf1` beginnen. | Beide zu einem Eintrag zusammenführen, den zweiten löschen. |
| SPF fail oder softfail | Der versendende Server steht nicht im Eintrag. | Den fehlenden Dienst per `include` ergänzen. |
| Zu viele DNS-Abfragen | Mehr als 10 Abfragen durch viele includes. | Nicht genutzte Dienste entfernen, Newsletter eventuell über eine Subdomain verschicken. |
