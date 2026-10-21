---
titel: "DMARC-Check: Stimmt deine Schutzregel?"
seoTitel: "DMARC Check: DMARC-Eintrag kostenlos prüfen und verstehen"
beschreibung: "Domain eingeben und sofort sehen, ob dein DMARC-Eintrag stimmt. Ohne Fachchinesisch, mit Anleitung für IONOS, STRATO, Microsoft 365 und mehr."
keyword: "dmarc check"
intro: "Gib deine Domain ein und sieh sofort, ob es eine Schutzregel gegen gefälschte Mails in deinem Namen gibt und was sie bewirkt. Ohne Testmail, ohne Konto."
faq:
  - frage: "Was ist ein DMARC-Check?"
    antwort: "Ein DMARC-Check liest den DMARC-Eintrag deiner Domain aus und prüft, ob er vorhanden, eindeutig und richtig geschrieben ist. Außerdem übersetzt er die Regel, also was Empfänger mit Mails tun sollen, die nicht nachweislich von dir stammen."
  - frage: "Wie richte ich DMARC ein?"
    antwort: "Du legst bei deinem DNS-Anbieter einen TXT-Eintrag mit dem Host _dmarc an. Starte mit v=DMARC1; p=none und verschärfe die Regel später, wenn alle deine Versender sauber durchkommen. Vorher sollten SPF und DKIM funktionieren."
  - frage: "Wofür steht DMARC?"
    antwort: "DMARC steht für Domain-based Message Authentication, Reporting and Conformance. Auf Deutsch: Deine Domain legt fest, wie Empfänger SPF und DKIM auswerten sollen und was mit Mails passiert, die durchfallen. Auf Wunsch bekommst du darüber Berichte."
  - frage: "Ist DMARC sinnvoll?"
    antwort: "Ja. Ohne DMARC kann jeder Mails mit deiner Absenderadresse verschicken, und Empfänger haben keine klare Anweisung, was sie damit tun sollen. Mit DMARC schützt du deine Kunden vor gefälschten Rechnungen in deinem Namen, und Spamfilter vertrauen deinen echten Mails eher."
  - frage: "Ist DMARC Pflicht?"
    antwort: "Gmail verlangt seit Februar 2024 und Microsoft für Outlook.com seit Mai 2025 einen DMARC-Eintrag von Absendern mit mehr als 5.000 Mails pro Tag. Für kleinere Absender gibt es keine feste Pflicht, ein fehlender Eintrag wirkt sich aber trotzdem auf die Zustellung aus."
stand: "2026-10-21"
---

## Was prüft der DMARC-Check?

DMARC ist die Schutzregel deiner Domain. Sie sagt jedem Empfänger: Wenn eine Mail behauptet, von mir zu kommen, aber weder SPF noch DKIM das bestätigen, dann mach Folgendes mit ihr. Ohne diese Regel entscheidet jeder Spamfilter selbst.

Unser DMARC-Check liest den Eintrag deiner Domain aus und beantwortet drei Fragen:

1. **Gibt es einen DMARC-Eintrag?** Er liegt immer unter `_dmarc.deine-domain.de`.
2. **Ist er gültig?** Also genau ein Eintrag, der mit `v=DMARC1` beginnt und eine Regel enthält.
3. **Was bewirkt er?** Wir übersetzen die Regel und die Zusatzangaben in Klartext.

Ein vollständiger Eintrag kann zum Beispiel so aussehen:

```
v=DMARC1; p=quarantine; rua=mailto:dmarc@deine-domain.de
```

## Die drei Regeln erklärt

Das Herzstück jedes DMARC-Eintrags ist `p=`, die Policy. Es gibt genau drei Werte:

| Regel | Was mit gefälschten Mails passiert | Im Mail-Test |
|---|---|---|
| `p=none` | Nichts. Empfänger sollen nur beobachten und dir auf Wunsch berichten. | Hinweis |
| `p=quarantine` | Die Mail landet beim Empfänger im Spam-Ordner. | OK |
| `p=reject` | Die Mail wird gar nicht erst angenommen. | OK |

`p=none` ist der richtige Start, weil du erst einmal siehst, wer alles in deinem Namen sendet, ohne etwas zu blockieren. Google und Microsoft empfehlen genau diesen Weg: erst `none`, dann `quarantine`, dann `reject`.

Weitere Angaben, die dir begegnen können:

- `rua=mailto:…` ist die Adresse, an die Empfänger zusammengefasste Berichte schicken.
- `pct=` legt fest, für wie viel Prozent der Mails die Regel gilt. Damit kannst du schrittweise verschärfen.
- `sp=` ist eine eigene Regel für Subdomains.

Was jedes Kürzel genau bedeutet und wie du von `none` zu `reject` kommst, erklärt der Ratgeber [DMARC-Eintrag einfach erklärt](/wissen/dmarc).

## Häufige Fehler

**Zwei DMARC-Einträge.** Wie bei SPF darf es nur einen geben. Zwei Einträge unter `_dmarc` machen die Regel unwirksam. Lösch den alten, bevor du einen neuen anlegst.

**Falscher Host.** Der Eintrag gehört auf `_dmarc`, nicht direkt auf die Domain. Hängt dein DNS-Formular die Domain automatisch an, trägst du nur `_dmarc` ein.

**Für immer `p=none`.** Viele legen DMARC an, um eine Warnung loszuwerden, und schauen nie wieder hin. Mit `p=none` schützt der Eintrag aber niemanden. Sobald deine echten Mails sauber durchkommen, stell auf `quarantine` um.

**Zu früh `p=reject`.** Das Gegenteil ist genauso riskant. Fehlt dein Newsletter-Tool noch in SPF oder DKIM, werden dessen Mails dann abgewiesen. Prüf vorher alle Versender.

**Regel da, aber SPF und DKIM passen nicht.** DMARC verlangt, dass SPF oder DKIM zu der Domain in deiner Absenderadresse passen. Unterschreibt zum Beispiel nur dein Versanddienst mit seiner eigenen Domain, fällt die Mail bei DMARC durch, obwohl die Unterschrift gültig ist. Das sieht nur eine echte Mail.

**Eine Regel, die du nie angelegt hast.** Manche Hoster setzen DMARC automatisch: IONOS eine Regel mit `p=none`, STRATO eine strenge Standardregel mit `p=reject`. Das ist kein Fehler. In der [Anleitung für STRATO](/anleitung/strato/dmarc) steht, wann du sie durch eine eigene ersetzen solltest.

## Was bringen DMARC-Berichte?

Mit `rua=` bekommst du regelmäßig zusammengefasste Berichte von großen Empfängern wie Gmail oder Outlook.com. Darin steht, welche Server Mails mit deiner Domain verschickt haben und ob sie SPF und DKIM bestanden haben. So findest du vergessene Versender, bevor du die Regel verschärfst.

Die Berichte kommen als technische Dateien, nicht als lesbare Mail. Für eine kleine Domain reicht es oft, beim Start ein paar Wochen mitzulesen oder stattdessen regelmäßig eine Testmail zu schicken. Leg für die Berichte am besten ein eigenes Postfach an, damit sie nicht dein normales Postfach füllen.

Nicht jeder Anbieter unterstützt Berichte. STRATO zum Beispiel verschickt aus Datenschutzgründen keine.

## DMARC-Check oder Testmail?

Der DMARC-Check zeigt dir die Regel. Ob deine Mails sie auch bestehen, zeigt erst eine echte Mail. Schick dazu eine Nachricht an den [Mail-Tester](/): Er prüft SPF, DKIM und DMARC zusammen und sagt dir, an welcher Stelle es hakt. Einzelne Einträge prüfst du mit dem [SPF-Check](/spf-check) und dem [DKIM-Check](/dkim-check).

## DMARC bei deinem Anbieter einrichten

- [DMARC bei IONOS einrichten](/anleitung/ionos/dmarc)
- [DMARC bei STRATO einrichten](/anleitung/strato/dmarc)
- [DMARC bei ALL-INKL im KAS anlegen](/anleitung/all-inkl/dmarc)
- [SPF, DKIM und DMARC bei Hetzner](/anleitung/hetzner/spf-dkim-dmarc)
- [DMARC für Google Workspace einrichten](/anleitung/google-workspace/dmarc)
- [DMARC für Microsoft 365 einrichten](/anleitung/microsoft-365/dmarc)
