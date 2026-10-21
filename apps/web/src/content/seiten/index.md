---
titel: "Kommt deine Mail an?"
seoTitel: "Mail Tester: Landen deine E-Mails im Spam? Kostenlos testen"
beschreibung: "Schick eine Testmail und bekomm in 30 Sekunden deinen Score von 0 bis 10. Mit Klartext-Anleitung für deinen Anbieter. Server in Deutschland, kein Konto."
keyword: "mail tester"
intro: "Schick eine normale Mail an diese Adresse. In 30 Sekunden weißt du, ob alles passt, und wie du auf 10 von 10 kommst."
faq:
  - frage: "Wie funktioniert ein Mail-Tester?"
    antwort: "Du schickst eine echte Mail an eine Testadresse. Der Mail-Tester empfängt sie wie ein normales Postfach und prüft, ob deine Domain den Absender bestätigt, ob die Mail digital unterschrieben ist, ob es eine Schutzregel gibt, ob dein Server auf einer Sperrliste steht und wie der Inhalt auf Spamfilter wirkt. Daraus entsteht ein Score von 0 bis 10."
  - frage: "Wie kann ich E-Mails testen?"
    antwort: "Kopier oben die Testadresse und schick von deinem normalen Postfach eine Mail dorthin, am besten so, wie du sonst auch schreibst. Nach rund 30 Sekunden siehst du dein Ergebnis. Willst du ein Kontaktformular oder ein Newsletter-Tool testen, trag die Testadresse dort als Empfänger ein."
  - frage: "Ist der Test kostenlos und wie oft darf ich testen?"
    antwort: "Ja, unbegrenzt: Es gibt kein Tageslimit wie bei manchen anderen Mail-Testern und du brauchst kein Konto. Damit niemand den Dienst mit Massen-Anfragen lahmlegt, sind höchstens 10 Tests pro Stunde möglich. Beim normalen Ablauf aus Testen, Ändern und erneut Testen kommst du da nicht hin."
  - frage: "Gibt es eine Alternative zu mail-tester.com ohne Limit?"
    antwort: "Ja, genau das ist e-mail-check.de. mail-tester.com erlaubt laut eigener FAQ 3 kostenlose Tests in 24 Stunden. Hier testest du ohne Tageslimit, auf Deutsch und mit Anleitung für deinen Anbieter. Den ausführlichen Vergleich findest du auf unserer Seite zur Mail-Tester-Alternative."
  - frage: "Was passiert mit meiner Testmail?"
    antwort: "Der Inhalt deiner Mail wird nur im Arbeitsspeicher ausgewertet und direkt danach gelöscht. Gespeichert wird nur die Zusammenfassung mit Score und Prüfpunkten, und auch die löschen wir nach 7 Tagen automatisch. Unsere Server stehen in Deutschland."
  - frage: "Was ist ein guter Score?"
    antwort: "Ab 9 von 10 bist du im grünen Bereich: Spamfilter haben keinen technischen Grund, deine Mail auszusortieren. 7 bis 8,9 ist solide, 5 bis 6,9 gefährdet, darunter landet viel im Spam. Ausnahme: Schlägt SPF, DKIM oder DMARC fehl, warnen wir immer, auch wenn die Zahl hoch ist."
  - frage: "Wie kann ich prüfen, ob ich auf einer Blacklist stehe?"
    antwort: "Schick eine Testmail. Wir prüfen die IP-Adresse deines sendenden Servers automatisch gegen zehn Sperrlisten, darunter Spamhaus, SpamCop, PSBL, Mailspike und NordSpam, und zusätzlich gegen die Positivlisten DNSWL und Mailspike. Steht dein Server auf einer Liste, siehst du das im Prüfpunkt Server-Ruf."
stand: "2026-10-21"
---

## So funktioniert's

Ein Mail-Tester empfängt deine Mail wie ein ganz normales Postfach und schaut ihr dabei genau auf die Finger. Er sieht also dasselbe wie der Spamfilter bei Gmail, Outlook oder GMX. Du musst dafür nichts einrichten.

1. **Adresse kopieren.** Oben steht deine persönliche Testadresse, zum Beispiel `k7m2x9qa@test.e-mail-check.de`. Sie gilt nur für deinen Test.
2. **Normale Mail schicken.** Schreib aus deinem üblichen Postfach, mit deiner Signatur und einem echten Betreff. Je echter die Mail, desto aussagekräftiger das Ergebnis. Du kannst die Adresse auch in dein Kontaktformular oder Newsletter-Tool eintragen.
3. **Ergebnis lesen.** Die Seite aktualisiert sich von selbst. Nach rund 30 Sekunden siehst du deinen Score, Teil-Scores für Technik, Server-Ruf und Inhalt und einen Aktionsplan: was zu tun ist und wie viele Punkte jede Behebung bringt, die größte Wirkung zuerst.

Bei jedem Problem steht direkt dabei, wie du es behebst. Du wählst deinen Anbieter und bekommst die Schritte mit dem DNS-Wert zum Kopieren. Danach testest du einfach noch einmal.

Das Ergebnis kannst du als Link teilen, zum Beispiel mit deinem Kunden oder deinem Webdesigner. Der Link ist 7 Tage gültig und nur für Leute erreichbar, die ihn kennen.

## Was wir prüfen

Wir prüfen fünf Dinge. Oben steht immer der Klartext, darunter klein der Fachbegriff. Die Rohdaten für Profis findest du ganz unten im Ergebnis zum Aufklappen.

| Prüfpunkt | Was dahintersteckt | Fachbegriff |
|---|---|---|
| Absender bestätigt | Deine Domain sagt öffentlich, welche Server Mails für sie verschicken dürfen. | SPF |
| Mail unterschrieben | Deine Mail trägt eine digitale Unterschrift, die beweist, dass sie unterwegs nicht verändert wurde. | DKIM |
| Schutzregel | Deine Domain legt fest, was mit gefälschten Mails in deinem Namen passieren soll. | DMARC |
| Server-Ruf | Der Server, der deine Mail verschickt, steht auf keiner Sperrliste und hat einen sauberen Namen. | Blacklists, rDNS |
| Inhalt | Betreff und Text wirken nicht wie Spam, alle Links funktionieren, keine Kurz-Links, Newsletter haben einen Abmelde-Link. | Spamfilter-Score, Link-Check, List-Unsubscribe |

Seit Februar 2024 verlangt Gmail, seit Mai 2025 auch Microsoft für Outlook.com von Vielversendern SPF, DKIM und DMARC. Die Regeln gelten offiziell ab 5.000 Mails pro Tag. Spamfilter werten diese Signale aber bei jedem Absender aus, auch bei deinem Kundenpostfach mit zehn Mails am Tag.

Mehr dazu, wie die drei Einträge zusammenspielen, liest du im Ratgeber [SPF, DKIM und DMARC einfach erklärt](/wissen/spf-dkim-dmarc).

## So entsteht dein Score

Kein Geheimrezept: Jede Mail startet bei 10 Punkten. Für jeden Befund ziehen wir einen festen Wert ab. Die wichtigsten Abzüge siehst du hier, vereinfacht.

| Befund | Abzug |
|---|---|
| Kein SPF-Eintrag oder SPF kaputt | 1,5 |
| SPF lehnt deinen Server ab (`-all` greift) | 2 |
| SPF mit `~all` greift | 1 |
| Keine DKIM-Unterschrift | 2 |
| DKIM-Unterschrift ungültig | 2,5 |
| Unterschrift nur von einem fremden Versanddienst | 0,5 |
| Kein DMARC-Eintrag | 1,5 |
| DMARC schlägt fehl (weder SPF noch DKIM passen zur Absenderadresse) | 2,5 |
| DMARC nur mit `p=none` | 0,2 |
| Server auf Spamhaus gelistet | 3 |
| Jede weitere Sperrliste | 1 (Sperrlisten zusammen höchstens 4) |
| Kein Rückwärts-Eintrag für die Server-IP | 1 |
| Inhalt wirkt nach Spam | 0 bis 4, je nach Spamfilter-Wertung |

Ein Beispiel: Fehlt nur der SPF-Eintrag, landest du bei 8,5. Fehlt die DKIM-Unterschrift und steht DMARC auf `p=none`, sind es 7,8.

Die Zahl ordnen wir in vier Bereiche ein: Hohes Risiko (unter 5), Gefährdet (5 bis 6,9), Solide (7 bis 8,9) und Sehr gut (ab 9). Eine Ausnahme gibt es: Schlägt SPF, DKIM oder DMARC fehl, warnen wir immer, auch bei 8,5 Punkten. So übersiehst du keinen fehlenden Eintrag, nur weil der Rest gut aussieht.

Den Inhalt bewerten wir getrennt von der Technik. So zählt ein fehlender SPF-Eintrag nicht doppelt, einmal bei „Absender bestätigt“ und noch einmal im Spam-Score.

## Eigentlich etwas anderes gesucht?

Dieser Mail-Tester prüft, ob **deine ausgehenden Mails** beim Empfänger ankommen. Er prüft nicht, ob eine fremde Adresse existiert, und auch nicht, ob dein Postfach gehackt wurde.

- **Ist deine Adresse in einem Datenleck aufgetaucht?** Das prüft der [Identity Leak Checker des Hasso-Plattner-Instituts](https://ilc.hpi.de/).
- **Glaubst du, dein Mail-Konto wurde gehackt?** Das BSI hat einen [Notfallplan für gehackte E-Mail-Konten](https://www.bsi.bund.de/DE/Themen/Verbraucherinnen-und-Verbraucher/Cyber-Sicherheitslage/Methoden-der-Cyber-Kriminalitaet/Identitaetsdiebstahl/Hilfe-fuer-Betroffene/hilfe-fuer-betroffene_node.html) mit den nächsten Schritten.

Landen eher Mails, die du bekommst, in deinem eigenen Spam-Ordner? Dann liegt das an deinem Postfach, nicht an deiner Domain. Hilfe findest du beim Anbieter deines Postfachs.

## Unbegrenzt testen, statt nach 3 Versuchen zu warten

Wer etwas repariert, testet oft: Eintrag ändern, testen, nächsten Eintrag ändern, wieder testen. Deshalb gibt es hier kein Tageslimit. Wie wir uns von anderen Testern unterscheiden, steht im [Vergleich mit mail-tester.com](/mail-tester-alternative).

## Datenschutz in drei Sätzen

Unsere Server stehen in Deutschland. Den Inhalt deiner Testmail werten wir nur im Arbeitsspeicher aus und löschen ihn direkt danach. Gespeichert wird nur die Zusammenfassung mit Score und Prüfpunkten, nach 7 Tagen ist auch die automatisch weg.

Ergebnis-Links sind nur über eine zufällige ID erreichbar und tauchen nicht bei Google auf. Wir nutzen kein Google Analytics und keine Tracking-Cookies, deshalb siehst du hier auch keinen Cookie-Banner.

## Ohne Testmail prüfen

Du willst nur schnell schauen, ob ein einzelner Eintrag stimmt? Dafür brauchst du keine Mail. Gib einfach deine Domain ein:

- [SPF-Eintrag prüfen](/spf-check): Welche Server dürfen für deine Domain senden?
- [DKIM prüfen](/dkim-check): Ist ein Schlüssel für die Unterschrift hinterlegt? Den Selektor suchen wir für dich.
- [DMARC-Eintrag prüfen](/dmarc-check): Welche Schutzregel gilt für deine Domain?

Der DNS-Check zeigt, was in deiner Domain eingetragen ist. Ob deine Mails wirklich passend unterschrieben rausgehen, sieht nur der Mail-Test oben. Bist du unsicher, schick lieber eine Testmail.

## Anleitungen für deinen Anbieter

Die meisten Probleme sind in fünf Minuten gelöst, wenn man weiß, wo man klicken muss. Wir haben Schritt-für-Schritt-Anleitungen für IONOS, STRATO, ALL-INKL, Hetzner, Google Workspace und Microsoft 365. Alle Anbieter findest du in der [Übersicht der Anleitungen](/anleitung).

Typisch bei den großen Hostern: SPF und DKIM laufen für ihre eigenen Mailserver schon automatisch. Es hakt erst, wenn ein zweiter Versender dazukommt, etwa ein Newsletter-Tool oder das Kontaktformular deiner Website. Bei Google Workspace und Microsoft 365 ist der häufigste Fehler, dass DKIM für die eigene Domain nie eingeschaltet wurde.

Deine Mails landen schon jetzt im Spam? Dann starte mit dem Ratgeber [Warum landen meine Mails im Spam?](/wissen/mails-landen-im-spam).
