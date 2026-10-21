---
titel: "SPF-Check: Wer darf für deine Domain senden?"
seoTitel: "SPF Check: SPF-Eintrag deiner Domain kostenlos prüfen"
beschreibung: "Prüf deinen SPF-Eintrag in Sekunden: Fehlt ein Versender, gibt es zwei Einträge, zu viele Abfragen? Klare Antwort und die passende Lösung."
keyword: "spf check"
intro: "Gib deine Domain ein und sieh sofort, welche Server Mails in deinem Namen verschicken dürfen. Du brauchst dafür keine Testmail und kein Konto."
faq:
  - frage: "Wie muss ein SPF-Eintrag aussehen?"
    antwort: "Ein SPF-Eintrag ist ein TXT-Eintrag direkt auf deiner Domain. Er beginnt immer mit v=spf1, dann folgen die erlaubten Versender, zum Beispiel include:_spf.google.com, und am Ende eine Regel wie ~all oder -all. Pro Domain darf es nur einen SPF-Eintrag geben."
  - frage: "Wie kann ich meinen SPF-Eintrag abfragen?"
    antwort: "Am einfachsten mit dem SPF-Check auf dieser Seite: Domain eingeben, fertig. Er liest den Eintrag aus, zählt die Abfragen und übersetzt ihn in Klartext. Ob dein Server im Alltag wirklich passt, zeigt dir eine Testmail an unseren Mail-Tester."
  - frage: "Was bedeutet ~all und -all?"
    antwort: "Beide Regeln stehen am Ende des Eintrags und sagen, was mit Mails von nicht genannten Servern passieren soll. Bei ~all sollen Empfänger sie misstrauisch behandeln, bei -all ablehnen. -all ist strenger, setzt aber voraus, dass wirklich jeder deiner Versender im Eintrag steht."
  - frage: "Darf ich zwei SPF-Einträge haben?"
    antwort: "Nein. Gibt es zwei TXT-Einträge mit v=spf1, ist SPF für die ganze Domain kaputt und Empfänger werten das als Fehler. Fass alle Versender in einem einzigen Eintrag zusammen."
stand: "2026-10-21"
---

## Was prüft der SPF-Check?

SPF ist die Gästeliste deiner Domain. Darin steht, welche Server Mails mit deiner Absenderadresse verschicken dürfen. Der Spamfilter des Empfängers schaut nach, ob der Server, der gerade liefert, auf dieser Liste steht.

Unser SPF-Check liest den Eintrag deiner Domain aus und beantwortet vier Fragen:

1. **Gibt es überhaupt einen SPF-Eintrag?** Ohne ihn kann jeder behaupten, für deine Domain zu senden.
2. **Gibt es genau einen?** Zwei Einträge machen SPF komplett unwirksam.
3. **Welche Versender stehen drin?** Wir übersetzen die Einträge, soweit wir sie kennen, in Namen wie „Google Workspace“ oder „IONOS“.
4. **Bleibt der Eintrag unter 10 Abfragen?** Wir zählen mit und zeigen dir „x von 10“.

Dazu übersetzen wir die Regel am Ende in Klartext, also was mit Mails von allen anderen Servern passieren soll.

## So sieht ein SPF-Eintrag aus

Ein typischer Eintrag für eine Domain mit Microsoft 365 sieht so aus:

```
v=spf1 include:spf.protection.outlook.com -all
```

Lies ihn von links nach rechts: `v=spf1` sagt, dass es ein SPF-Eintrag ist. `include:` holt die Serverliste von Microsoft dazu. `-all` heißt: Alle anderen Server sind nicht erlaubt.

Die Regel am Ende ist der wichtigste Teil:

| Ende | Bedeutung | Im Mail-Test |
|---|---|---|
| `-all` | Andere Server sind verboten, Empfänger sollen ablehnen. | Greift die Regel, Problem |
| `~all` | Andere Server sind verdächtig, Empfänger sollen genauer hinschauen. | Greift die Regel, Hinweis |
| `?all` | Keine Aussage über andere Server. | Hinweis |
| `+all` | Jeder Server der Welt darf senden. | Nie verwenden |

Mehr zum Aufbau und zu allen Bausteinen findest du im Ratgeber [SPF-Eintrag einfach erklärt](/wissen/spf).

## Häufige Fehler

**Ein Versender fehlt.** Der Klassiker: Dein Postfach liegt bei IONOS oder STRATO, dein Newsletter läuft über ein externes Tool und die Website verschickt Kontaktformular-Mails über einen dritten Server. Steht einer davon nicht im SPF-Eintrag, landen genau diese Mails im Spam. Sammle vor jeder Änderung alle Dienste, die in deinem Namen schreiben.

**Zwei SPF-Einträge.** Passiert oft, wenn ein neues Tool sagt „leg diesen TXT-Eintrag an“ und der alte stehen bleibt. Dann ist SPF für die ganze Domain kaputt. Richtig ist ein einziger Eintrag mit mehreren `include:`.

```
v=spf1 include:_spf.google.com include:spf.protection.outlook.com ~all
```

Das Beispiel zeigt nur das Prinzip, nimm die Werte deiner eigenen Versender.

**Mehr als 10 Abfragen.** Jedes `include`, `a`, `mx`, `exists` und `redirect` löst beim Empfänger eine DNS-Abfrage aus, auch verschachtelte innerhalb eines `include`. Ab der elften gilt der Eintrag als kaputt. Entferne Dienste, die du nicht mehr nutzt, oder lass einen Newsletter-Dienst über eine eigene Subdomain senden.

**Tippfehler.** Ein fehlendes Leerzeichen, `v=spf 1` statt `v=spf1`, ein Punkt am Ende oder Anführungszeichen, die ein DNS-Formular doppelt setzt. Der Check zeigt dir die Stelle, an der der Eintrag nicht mehr lesbar ist.

**Altlast `spf2.0` oder Typ „SPF“.** Ältere Anleitungen nennen manchmal Einträge mit `spf2.0` oder den eigenen DNS-Typ „SPF“. Beides werten Empfänger heute nicht mehr aus. Entscheidend ist ein normaler TXT-Eintrag mit `v=spf1`. Bei manchen Hostern heißt die Auswahl im Formular trotzdem „TXT (SPF)“ oder „IONOS SPF (TXT)“, das ist in Ordnung.

**Eintrag auf der falschen Domain.** Der SPF-Eintrag gehört auf die Domain selbst (Host `@` oder leer), nicht auf `www` oder `mail`. Für Subdomains, die selbst Mails verschicken, brauchst du jeweils einen eigenen Eintrag.

## SPF-Check oder Testmail?

Der SPF-Check zeigt dir, was in deiner Domain steht. Er weiß aber nicht, über welchen Server deine Mails tatsächlich rausgehen. Ein Eintrag kann formal perfekt sein und trotzdem deinen Webserver vergessen.

Am sichersten ist deshalb beides: Erst hier den Eintrag prüfen, dann eine echte Mail an den [Mail-Tester](/) schicken. Der sieht, welcher Server geliefert hat, und prüft ihn gegen deinen Eintrag. Wenn du schon dabei bist, prüf auch gleich die anderen beiden Einträge mit dem [DKIM-Check](/dkim-check) und dem [DMARC-Check](/dmarc-check).

## SPF bei deinem Anbieter einrichten

Bei vielen Hostern ist SPF für die eigenen Mailserver schon gesetzt. Du musst meist nur etwas tun, wenn ein weiterer Versender dazukommt. So geht es Schritt für Schritt:

- [SPF-Eintrag bei IONOS setzen](/anleitung/ionos/spf)
- [SPF-Eintrag bei STRATO setzen](/anleitung/strato/spf)
- [SPF-Eintrag bei ALL-INKL im KAS bearbeiten](/anleitung/all-inkl/spf)
- [SPF, DKIM und DMARC bei Hetzner](/anleitung/hetzner/spf-dkim-dmarc)
- [SPF für Google Workspace einrichten](/anleitung/google-workspace/spf)
- [SPF für Microsoft 365 einrichten](/anleitung/microsoft-365/spf)
