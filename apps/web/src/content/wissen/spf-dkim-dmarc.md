---
titel: "SPF, DKIM und DMARC: Der Unterschied einfach erklärt"
seoTitel: "SPF, DKIM und DMARC: Der Unterschied einfach erklärt"
beschreibung: "SPF, DKIM und DMARC sorgen dafür, dass deine Mails ankommen. Was jeder Eintrag macht und warum du alle drei brauchst, in fünf Minuten erklärt."
keyword: "spf dkim dmarc"
kurz: "SPF legt fest, welche Server für deine Domain senden dürfen. DKIM hängt an jede Mail eine digitale Unterschrift. DMARC sagt Empfängern, was mit Mails passieren soll, die beides nicht bestehen. Erst alle drei zusammen schützen deine Domain vor Fälschungen und sorgen dafür, dass deine Mails nicht im Spam landen."
faq:
  - frage: "Brauche ich wirklich alle drei: SPF, DKIM und DMARC?"
    antwort: "Ja. Gmail verlangt seit Februar 2024 und Microsoft seit Mai 2025 von Vielversendern alle drei. Auch bei kleineren Absendern werten Spamfilter die Signale aus. Jeder Eintrag deckt eine Lücke ab, die die anderen beiden offen lassen."
  - frage: "Was ist der Unterschied zwischen SPF und DKIM?"
    antwort: "SPF prüft, ob der Server, der die Mail verschickt hat, dafür zugelassen ist. DKIM prüft, ob die Mail eine gültige Unterschrift deiner Domain trägt und unterwegs nicht verändert wurde. SPF geht bei Weiterleitungen oft kaputt, DKIM meist nicht."
  - frage: "In welcher Reihenfolge richte ich SPF, DKIM und DMARC ein?"
    antwort: "Erst SPF, dann DKIM, zuletzt DMARC. DMARC baut auf den beiden anderen auf. Wer DMARC zuerst streng einstellt, riskiert, dass eigene Mails abgelehnt werden."
  - frage: "Wie prüfe ich SPF, DKIM und DMARC auf einmal?"
    antwort: "Schick eine Testmail an unseren Mail-Tester. Nach rund 30 Sekunden siehst du alle drei Prüfpunkte plus Server-Ruf und Inhalt, mit Score von 0 bis 10. Für einzelne Einträge ohne Testmail gibt es den SPF-, DKIM- und DMARC-Check."
quelle:
  - titel: "RFC 7208: Sender Policy Framework (SPF)"
    url: "https://www.rfc-editor.org/rfc/rfc7208.html"
  - titel: "RFC 6376: DomainKeys Identified Mail (DKIM) Signatures"
    url: "https://www.rfc-editor.org/rfc/rfc6376.html"
  - titel: "RFC 9989: Domain-based Message Authentication, Reporting, and Conformance (DMARC)"
    url: "https://www.rfc-editor.org/rfc/rfc9989.html"
  - titel: "Google: Richtlinien für E-Mail-Absender"
    url: "https://support.google.com/a/answer/81126?hl=de"
stand: "2026-10-21"
reihenfolge: 4
---

## Die drei auf einen Blick

| Prüfpunkt in unserem Test | Fachbegriff | Was er macht | Wo er steht |
|---|---|---|---|
| **Absender bestätigt** | SPF | Liste der Server, die für deine Domain senden dürfen | TXT-Eintrag auf `deine-domain.de` |
| **Mail unterschrieben** | DKIM | Digitale Unterschrift an jeder Mail | TXT oder CNAME unter `selektor._domainkey.deine-domain.de` |
| **Schutzregel** | DMARC | Regel, was mit Mails passiert, die durchfallen | TXT-Eintrag unter `_dmarc.deine-domain.de` |

Ein Bild, das hilft: Deine Mail ist ein Paket. **SPF** prüft, ob der Paketbote zu deiner Firma gehört. **DKIM** prüft das Siegel auf dem Paket. **DMARC** ist deine Anweisung an den Empfänger: „Kein Bote von mir und kein Siegel? Nimm das Paket nicht an.“

## Was jeder Eintrag kann und was nicht

### SPF: Absender bestätigt

SPF ist schnell eingerichtet und bei vielen Hostern schon gesetzt. Es hat aber zwei Schwächen. Erstens prüft es nur die technische Absenderadresse, nicht die, die der Empfänger im Feld „Von“ sieht. Zweitens geht SPF kaputt, wenn eine Mail weitergeleitet wird, weil sie dann von einem fremden Server kommt.

Ein Beispiel für einen SPF-Eintrag:

```
v=spf1 include:_spf-eu.ionos.com ~all
```

Alles Weitere im Artikel [SPF-Eintrag einfach erklärt](/wissen/spf).

### DKIM: Mail unterschrieben

DKIM ist die robustere Prüfung. Die Unterschrift hängt an der Mail selbst und übersteht Weiterleitungen meist unbeschadet. Dafür ist die Einrichtung etwas aufwendiger, vor allem bei Google Workspace und Microsoft 365, wo du DKIM selbst einschalten musst.

Alles Weitere im Artikel [DKIM einfach erklärt](/wissen/dkim).

### DMARC: Schutzregel

DMARC schließt die Lücke, die SPF und DKIM offen lassen. Es verlangt, dass die geprüfte Domain zur sichtbaren „Von“-Adresse passt. Und es legt fest, was mit Mails passiert, die durchfallen: nichts (`none`), Spam-Ordner (`quarantine`) oder Ablehnung (`reject`).

Ein Beispiel für einen DMARC-Eintrag zum Start:

```
v=DMARC1; p=none; rua=mailto:dmarc@deine-domain.de
```

Alles Weitere im Artikel [DMARC-Eintrag einfach erklärt](/wissen/dmarc).

## Wie sie zusammenspielen

Wenn deine Mail beim Empfänger ankommt, laufen die Prüfungen nacheinander ab:

1. **SPF:** Kommt die Mail von einem erlaubten Server? Ergebnis: bestanden oder nicht.
2. **DKIM:** Ist die Unterschrift gültig? Ergebnis: bestanden oder nicht.
3. **DMARC:** Hat SPF oder DKIM bestanden, **und** passt die geprüfte Domain zur „Von“-Adresse? Wenn ja: DMARC bestanden. Wenn nein: Der Empfänger wendet deine Regel an.

Wichtig: Für DMARC reicht **eins** von beiden. Das ist dein Sicherheitsnetz. Wird eine Mail weitergeleitet und SPF bricht, rettet DKIM das Ergebnis. Deshalb ist DKIM so wichtig.

Ein typischer Fall aus der Praxis: Eine Agentur richtet für einen Kunden ein Newsletter-Tool ein. Das Tool steht im SPF-Eintrag, DKIM für die Kunden-Domain ist aber nicht eingerichtet. Viele Tools nutzen eine eigene technische Absenderadresse und unterschreiben mit ihrer eigenen Domain. Ergebnis: SPF und DKIM bestehen zwar, aber jeweils für die Domain des Tools, nicht für die des Kunden. DMARC fällt durch, und ab `p=quarantine` landet der Newsletter im Spam.

## Reihenfolge beim Einrichten

1. **Versender sammeln.** Postfach, Website, Newsletter, Shop, Buchhaltung: Wer verschickt Mails mit deiner Domain?
2. **SPF einrichten.** Ein einziger Eintrag mit allen Versendern. Prüfen mit dem [SPF-Check](/spf-check).
3. **DKIM einrichten.** Für jeden Versender mit deiner Domain. Prüfen mit dem [DKIM-Check](/dkim-check).
4. **DMARC mit `p=none` starten.** Prüfen mit dem [DMARC-Check](/dmarc-check).
5. **Testmail schicken.** Aus jedem System, das Mails verschickt, eine [Testmail an unseren Mail-Tester](/).
6. **Regel verschärfen.** Nach einigen Wochen ohne Auffälligkeiten auf `quarantine`, später auf `reject`.

Die Reihenfolge ist kein Zufall: DMARC wertet SPF und DKIM aus. Wer DMARC zuerst und gleich streng setzt, sperrt im schlimmsten Fall seine eigenen Mails aus.

## Checkliste

- [ ] Es gibt genau **einen** SPF-Eintrag, und alle Versender stehen darin.
- [ ] Der SPF-Eintrag braucht höchstens 10 DNS-Abfragen.
- [ ] Jeder Versender unterschreibt per DKIM **mit deiner Domain**, nicht mit seiner eigenen.
- [ ] Bei Google Workspace und Microsoft 365 ist DKIM ausdrücklich eingeschaltet.
- [ ] Es gibt genau **einen** DMARC-Eintrag unter `_dmarc`.
- [ ] Der DMARC-Eintrag beginnt mit `v=DMARC1` und enthält eine Regel `p=`.
- [ ] Eine Testmail aus jedem System zeigt alle drei Prüfpunkte grün.

## Drei häufige Missverständnisse

**„Mein Hoster hat das doch alles eingerichtet.“** Für die eigenen Postfächer stimmt das bei IONOS, STRATO und ALL-INKL meist. Für alles, was zusätzlich Mails verschickt, nicht. Newsletter-Tool, Shop oder Buchhaltungssoftware musst du selbst ergänzen.

**„SPF ist grün, also passt alles.“** SPF allein sagt nichts darüber, ob jemand deine sichtbare Adresse fälscht. Und SPF bricht bei Weiterleitungen. Ohne DKIM und DMARC fehlt der Schutz, den Gmail und Microsoft erwarten.

**„DMARC mit p=none bringt nichts.“** Es schützt noch nicht vor Fälschungen, das stimmt. Aber es erfüllt die Mindestanforderung der großen Anbieter, liefert dir Berichte über alle Versender und ist der sichere erste Schritt. Wichtig ist nur, dort nicht stehen zu bleiben.

## Was SPF, DKIM und DMARC nicht abdecken

Auch mit drei grünen Haken kann eine Mail im Spam landen. Zwei weitere Punkte prüft unser Mail-Test deshalb mit:

- **Server-Ruf:** Steht der versendende Server auf einer Sperrliste? Hat er einen sauberen Reverse-DNS-Eintrag (rDNS)?
- **Inhalt:** Wirkt die Mail für Spamfilter verdächtig, etwa durch einen Betreff in Großbuchstaben?

Mehr dazu im Ratgeber [Warum landen meine Mails im Spam?](/wissen/mails-landen-im-spam).

## Anleitungen für deinen Anbieter

Wo du die Einträge setzt, hängt von deinem Anbieter ab. Bei IONOS, STRATO und ALL-INKL ist vieles schon aktiv, bei Google Workspace und Microsoft 365 musst du mehr selbst machen. Alle Schritt-für-Schritt-Anleitungen findest du in der [Übersicht der Anbieter-Anleitungen](/anleitung), zum Beispiel:

- [DKIM bei IONOS einrichten](/anleitung/ionos/dkim)
- [DMARC bei STRATO einrichten](/anleitung/strato/dmarc)
- [DKIM bei Microsoft 365 einrichten](/anleitung/microsoft-365/dkim)
- [DKIM bei Google Workspace einrichten](/anleitung/google-workspace/dkim)
- [SPF, DKIM und DMARC bei Hetzner einrichten](/anleitung/hetzner/spf-dkim-dmarc)
