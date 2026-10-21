---
titel: "DKIM-Check: Ist deine Mail unterschrieben?"
seoTitel: "DKIM Check: Mail-Signatur prüfen, auch ohne Selektor"
beschreibung: "Prüf, ob deine Mails eine gültige DKIM-Unterschrift haben. Du kennst deinen Selektor nicht? Kein Problem, wir suchen ihn für dich."
keyword: "dkim check"
intro: "Gib deine Domain ein und sieh, ob ein Schlüssel für die digitale Unterschrift deiner Mails hinterlegt ist. Den Selektor musst du nicht kennen, wir suchen ihn für dich."
faq:
  - frage: "Wie finde ich meinen DKIM-Selektor?"
    antwort: "Am schnellsten mit einer Testmail an unseren Mail-Tester: Der Selektor steht in der Unterschrift jeder Mail und wir zeigen ihn dir im Ergebnis. Alternativ zeigt ihn dein Anbieter dort an, wo du DKIM aktivierst, etwa in der Admin-Konsole von Google Workspace oder im Defender-Portal von Microsoft 365."
  - frage: "Warum zeigt der Check „kein DKIM gefunden“, obwohl meine Mails signiert sind?"
    antwort: "Meist heißt dein Selektor anders als die verbreiteten Namen, die wir automatisch durchsuchen. Manche Anbieter vergeben Selektoren mit Zufallszahlen oder wechseln sie gelegentlich. Trag den Selektor von Hand ein oder schick eine Testmail, die findet ihn immer."
  - frage: "Wie richte ich DKIM ein?"
    antwort: "Bei IONOS, STRATO und ALL-INKL ist DKIM für Mails über deren eigene Server schon aktiv. Bei Google Workspace und Microsoft 365 musst du DKIM selbst einschalten und dafür einen DNS-Eintrag setzen. Die genauen Schritte stehen in unseren Anleitungen pro Anbieter."
  - frage: "Ist DKIM sinnvoll?"
    antwort: "Ja. Ohne Unterschrift kann der Empfänger nicht erkennen, ob eine Mail wirklich von dir stammt und unterwegs unverändert blieb. Gmail und Microsoft verlangen DKIM von Vielversendern, und auch bei kleinen Absendern werten Spamfilter eine fehlende Unterschrift negativ."
stand: "2026-10-21"
---

## Was prüft der DKIM-Check?

DKIM ist die digitale Unterschrift deiner Mails. Dein Mailserver unterschreibt jede Mail mit einem geheimen Schlüssel. Den passenden öffentlichen Schlüssel legst du in deiner Domain ab, damit jeder Empfänger die Unterschrift prüfen kann.

Unser DKIM-Check sucht diesen öffentlichen Schlüssel in deiner Domain. Er zeigt dir:

1. **Ob ein Schlüssel gefunden wurde** und unter welchem Selektor.
2. **Ob der Eintrag lesbar ist**, also kein Tippfehler und kein abgeschnittener Schlüssel.
3. **Wie lang der Schlüssel ist.** Unter 2048 Bit geben wir dir den Tipp, ihn bei Gelegenheit zu erneuern.

## Was ist ein Selektor?

Eine Domain kann mehrere DKIM-Schlüssel haben, zum Beispiel einen für dein Postfach und einen für dein Newsletter-Tool. Damit der Empfänger weiß, welcher gemeint ist, hat jeder Schlüssel einen Namen: den Selektor.

Der Schlüssel liegt dann unter einer Adresse nach diesem Muster:

```
selektor._domainkey.deine-domain.de
```

Das Problem: Ohne den Selektor kann niemand den Schlüssel finden. Die meisten DKIM-Checks fragen deshalb danach, und kaum jemand weiß ihn auswendig.

## Kein Selektor? Wir suchen ihn für dich

Lässt du das Feld leer, probiert unser Check automatisch die verbreitetsten Selektoren durch. Dazu gehören unter anderem `default`, `selector1`, `selector2`, `google`, `s1-ionos`, `s2-ionos`, `k1` und `mail`. Damit sind die Standard-Einstellungen vieler Anbieter abgedeckt.

Findet der Check nichts, heißt das nicht automatisch, dass deine Mails unsigniert sind. Vielleicht nutzt dein Anbieter einen eigenen Namen. Dann hilft die Tabelle unten oder eine Testmail.

## So heißt dein Selektor

| Anbieter | Selektor | Hinweis |
|---|---|---|
| IONOS | `s1-ionos`, `s2-ionos`, `s42582890` | Alle drei als CNAME auf `dkim.ionos.com`. Bei IONOS-Nameservern automatisch aktiv. |
| Google Workspace | `google` | Standard-Präfix beim Erzeugen des Schlüssels in der Admin-Konsole. |
| Microsoft 365 | `selector1`, `selector2` | Erst nach dem Einschalten im Defender-Portal für deine eigene Domain aktiv. |
| Hetzner (konsoleH) | z. B. `default_1707` | Wird beim Aktivieren erzeugt und angezeigt. Die Zahl unterscheidet sich je Schlüssel. |
| STRATO | `strato-dkim-0002`, `strato-dkim-0003` | Automatisch aktiv. STRATO kann die Selektoren wechseln, im Zweifel per Testmail prüfen. |
| ALL-INKL | `kas` plus Zeitstempel (z. B. `kas202504012217`) | Für jede Domain anders, deshalb nicht automatisch auffindbar. Am sichersten per Testmail. |

Nutzt du ein Newsletter-Tool oder einen anderen Versanddienst, nennt dir der Dienst den Selektor bei der Domain-Einrichtung.

Je nach Anbieter liegt der Schlüssel direkt als TXT-Eintrag in deiner Domain oder du setzt einen CNAME-Eintrag, der auf den Schlüssel beim Anbieter zeigt. IONOS und Microsoft 365 arbeiten mit CNAME, Google Workspace mit TXT. Für den Check macht das keinen Unterschied: Wir folgen dem Verweis und prüfen den Schlüssel am Ziel.

## Am sichersten: eine Testmail

Der DKIM-Check zeigt, ob ein Schlüssel in deiner Domain liegt. Ob deine Mails damit auch wirklich unterschrieben rausgehen, sieht er nicht. Genau da liegt der häufigste Fehler bei Google Workspace und Microsoft 365: Der Eintrag ist gesetzt, aber DKIM wurde nie eingeschaltet.

Schick deshalb im Zweifel eine Mail an den [Mail-Tester](/). Der liest die Unterschrift direkt aus der Mail, prüft sie und zeigt dir den Selektor. Er sieht außerdem, ob die Unterschrift zu deiner Absenderadresse passt oder nur von einem fremden Versanddienst stammt. Das ist wichtig für deine [DMARC-Schutzregel](/dmarc-check).

## Häufige Fehler

**DKIM nie aktiviert.** Bei Microsoft 365 und Google Workspace reicht der DNS-Eintrag allein nicht. Erst wenn du die Signatur im Portal einschaltest, unterschreibt der Dienst mit deiner Domain. Vorher unterschreibt Microsoft 365 nur mit der `onmicrosoft.com`-Adresse.

**Schlüssel abgeschnitten.** DKIM-Schlüssel sind lang. Manche DNS-Formulare kürzen sie oder brechen sie falsch um. Kopier den Wert komplett und prüf ihn danach hier.

**Eintrag am falschen Ort.** Der Host muss `selektor._domainkey` heißen. Hängt das Formular deine Domain automatisch an, trägst du sie nicht noch einmal ein, sonst landet der Eintrag unter `selektor._domainkey.deine-domain.de.deine-domain.de`.

**Zusatz-Versender ohne Unterschrift.** Dein Postfach unterschreibt sauber, dein Newsletter-Tool aber nicht mit deiner Domain. Richte DKIM in jedem Dienst ein, der in deinem Namen sendet.

Mehr zum Hintergrund liest du im Ratgeber [Was ist DKIM?](/wissen/dkim). Den Absender prüfst du mit dem [SPF-Check](/spf-check).

## DKIM bei deinem Anbieter einrichten

- [DKIM bei IONOS einrichten](/anleitung/ionos/dkim)
- [DKIM bei STRATO prüfen und einrichten](/anleitung/strato/dkim)
- [DKIM bei ALL-INKL im KAS anlegen](/anleitung/all-inkl/dkim)
- [SPF, DKIM und DMARC bei Hetzner](/anleitung/hetzner/spf-dkim-dmarc)
- [DKIM in Google Workspace aktivieren](/anleitung/google-workspace/dkim)
- [DKIM in Microsoft 365 aktivieren](/anleitung/microsoft-365/dkim)
