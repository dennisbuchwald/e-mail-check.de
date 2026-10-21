---
titel: "SPF, DKIM und DMARC einrichten: Anleitungen pro Anbieter"
seoTitel: "SPF, DKIM, DMARC einrichten: Anleitungen pro Anbieter"
beschreibung: "Schritt-für-Schritt-Anleitungen für IONOS, STRATO, ALL-INKL, Hetzner, Google Workspace und Microsoft 365. Wähl deinen Anbieter."
keyword: "spf dkim dmarc einrichten"
intro: "Wähl deinen Anbieter und folge den Schritten, mit dem DNS-Wert zum Kopieren. Die meisten Einträge sind in fünf Minuten gesetzt."
faq: []
stand: "2026-10-21"
---

## Zwei Fragen, bevor du loslegst

Bei Mail-Einstellungen sind oft zwei verschiedene Anbieter im Spiel. Das ist der häufigste Grund, warum Anleitungen nicht passen. Beantworte deshalb zuerst diese beiden Fragen.

**Wo liegt deine Domain?** Gemeint ist der Anbieter, bei dem du die DNS-Einträge deiner Domain bearbeitest. Dort trägst du SPF, DKIM und DMARC ein. Oft ist das der Hoster deiner Website, also zum Beispiel IONOS, STRATO, ALL-INKL oder Hetzner.

**Wer verschickt deine Mails?** Das ist der Dienst, über den deine Mails tatsächlich rausgehen. Das kann derselbe Hoster sein. Häufig ist es aber Google Workspace oder Microsoft 365, und dazu kommen oft noch ein Newsletter-Tool und das Kontaktformular deiner Website.

Ein typisches Beispiel: Die Domain liegt bei IONOS, die Postfächer laufen über Microsoft 365. Dann sagt dir die Microsoft-Anleitung, welche Werte du brauchst, und die IONOS-Anleitung, wo du sie einträgst.

## Was bei deinem Anbieter schon läuft

Bei IONOS, STRATO, ALL-INKL und Hetzner sind SPF und DKIM für Mails über deren eigene Server meist schon eingerichtet. Du musst dort vor allem dann etwas tun, wenn ein weiterer Versender dazukommt. Fehlt der im SPF-Eintrag oder hat er keine eigene Unterschrift, landen genau seine Mails im Spam.

Bei Google Workspace und Microsoft 365 ist es umgekehrt: Für deine eigene Domain musst du DKIM selbst einschalten. Wer das vergisst, verschickt Mails ohne passende Unterschrift, und die Schutzregel greift ins Leere.

DMARC setzen manche Anbieter automatisch: IONOS legt bei Domains mit IONOS-Postfach eine Regel im Beobachtungsmodus (`p=none`) an, STRATO eine strenge Standardregel (`p=reject`). Bei den anderen musst du den Eintrag selbst anlegen.

## In welcher Reihenfolge?

1. **SPF:** Leg fest, welche Server für deine Domain senden dürfen.
2. **DKIM:** Sorg dafür, dass jede Mail digital unterschrieben ist.
3. **DMARC:** Leg die Schutzregel fest, zuerst mit `p=none` zum Beobachten.

Warum diese Reihenfolge sinnvoll ist, erklärt der Ratgeber [SPF, DKIM und DMARC im Überblick](/wissen/spf-dkim-dmarc).

## Erst testen, dann einrichten

Du weißt nicht, was bei dir fehlt? Schick zuerst eine Mail an den [Mail-Tester](/). Das Ergebnis zeigt dir in 30 Sekunden, welcher der drei Punkte ein Problem hat, und führt dich direkt zur passenden Anleitung. So änderst du nur, was wirklich kaputt ist.

Einzelne Einträge prüfst du auch ohne Mail mit dem [SPF-Check](/spf-check), dem [DKIM-Check](/dkim-check) oder dem [DMARC-Check](/dmarc-check). Nach jeder Änderung testest du einfach noch einmal. Je nach Anbieter kann es einige Stunden dauern, bis ein neuer Eintrag überall sichtbar ist.

Alle Anleitungen beruhen auf den offiziellen Hilfeseiten der Anbieter.
