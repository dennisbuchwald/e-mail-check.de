---
titel: "DMARC-Eintrag einfach erklärt"
seoTitel: "DMARC-Eintrag einfach erklärt: Aufbau, Beispiel, Einrichtung"
beschreibung: "Was ist DMARC, wie sieht ein DMARC-Eintrag aus und welche Regel ist die richtige? Einfach erklärt, mit Beispielen zum Kopieren."
keyword: "dmarc eintrag"
kurz: "DMARC ist eine Regel in deinem DNS, die Empfängern sagt, was mit Mails passieren soll, die angeblich von deiner Domain kommen, aber die Prüfung nicht bestehen. Der DMARC-Eintrag ist ein TXT-Eintrag unter _dmarc.deine-domain.de, zum Beispiel v=DMARC1; p=none. Er schützt deine Domain vor Fälschungen und ist für Vielversender bei Gmail und Outlook.com Pflicht."
faq:
  - frage: "Ist DMARC sinnvoll?"
    antwort: "Ja, für jede Domain, die Mails verschickt. DMARC macht es Betrügern schwerer, Mails in deinem Namen zu fälschen, und große Postfach-Anbieter werten einen fehlenden Eintrag als Minuspunkt. Der Aufwand ist ein einziger DNS-Eintrag."
  - frage: "Wie aktiviere ich DMARC?"
    antwort: "Du legst bei dem Anbieter, der deine DNS-Einträge verwaltet, einen TXT-Eintrag mit dem Namen _dmarc an. Als Wert reicht für den Start v=DMARC1; p=none. Vorher sollten SPF und DKIM für alle deine Versender funktionieren."
  - frage: "Ist DMARC verpflichtend?"
    antwort: "Gesetzlich nicht. Gmail verlangt DMARC seit Februar 2024 von allen, die mehr als 5.000 Mails pro Tag an Gmail-Adressen schicken, Microsoft seit Mai 2025 für Outlook.com, Hotmail und Live. Für kleinere Absender ist DMARC keine Pflicht, wird von Spamfiltern aber positiv bewertet."
  - frage: "Wie kann ich DMARC abfragen?"
    antwort: "Am einfachsten mit unserem DMARC-Check: Domain eingeben, und du siehst sofort, ob ein Eintrag existiert und was er bedeutet. Technisch fragst du den TXT-Eintrag unter _dmarc.deine-domain.de ab."
  - frage: "Wie erstelle ich einen DMARC-Record?"
    antwort: "Ein DMARC-Record beginnt immer mit v=DMARC1, danach folgt die Regel p=none, p=quarantine oder p=reject. Optional kommt mit rua eine Adresse für Berichte dazu. Den fertigen Text trägst du als TXT-Eintrag unter dem Namen _dmarc ein."
quelle:
  - titel: "RFC 9989: Domain-based Message Authentication, Reporting, and Conformance (DMARC)"
    url: "https://www.rfc-editor.org/rfc/rfc9989.html"
  - titel: "Google: Richtlinien für E-Mail-Absender"
    url: "https://support.google.com/a/answer/81126?hl=de"
  - titel: "Google Workspace: DMARC einrichten"
    url: "https://knowledge.workspace.google.com/admin/security/set-up-dmarc?hl=de"
  - titel: "Microsoft Learn: DMARC zum Überprüfen der Absenderdomäne einrichten"
    url: "https://learn.microsoft.com/de-de/defender-office-365/email-authentication-dmarc-configure"
  - titel: "Microsoft: Neue Anforderungen von Outlook für Vielversender"
    url: "https://techcommunity.microsoft.com/blog/outlook/strengthening-email-ecosystem-outlook%E2%80%99s-new-requirements-for-high%E2%80%90volume-senders/4399730"
stand: "2026-10-21"
reihenfolge: 1
---

## DMARC in einem Satz

Stell dir DMARC wie einen Türsteher mit einer Gästeliste vor. SPF und DKIM sind die Ausweise, die eine Mail vorzeigt. DMARC ist die Anweisung, die du dem Türsteher gibst: „Wer keinen gültigen Ausweis mit meinem Namen hat, kommt nicht rein“ oder „kommt in den Nebenraum“ oder vorerst „darf rein, aber sag mir Bescheid“.

Ohne DMARC entscheidet jeder Empfänger selbst, was er mit einer verdächtigen Mail in deinem Namen macht. Mit DMARC gibst du die Regel vor. In unserem Mail-Test heißt dieser Prüfpunkt deshalb **Schutzregel**.

## Wie funktioniert DMARC?

Wenn eine Mail ankommt, prüft der Empfänger zuerst zwei Dinge:

1. **Absender bestätigt (SPF):** Darf der Server, der die Mail geschickt hat, für die Domain senden?
2. **Mail unterschrieben (DKIM):** Trägt die Mail eine gültige digitale Unterschrift?

DMARC fügt eine dritte Frage hinzu: Passt die bestätigte Domain zu der Adresse, die der Empfänger im Feld „Von“ sieht? Das nennt man **Alignment** (Übereinstimmung). Genau hier liegt der Trick. SPF prüft nämlich nur eine technische Absenderadresse, die der Empfänger nie zu Gesicht bekommt. Ein Betrüger könnte SPF mit seiner eigenen Domain bestehen und trotzdem `chef@deine-domain.de` ins „Von“-Feld schreiben.

DMARC gilt als bestanden, wenn **mindestens eins** von beiden klappt:

- SPF ist gültig **und** die geprüfte Domain passt zur „Von“-Adresse, oder
- DKIM ist gültig **und** die unterschreibende Domain passt zur „Von“-Adresse.

Fällt beides durch, wendet der Empfänger deine Regel an. Steht sie auf `none`, passiert nichts weiter. Bei `quarantine` landet die Mail im Spam, bei `reject` wird sie abgelehnt.

Übrigens: Ein Newsletter-Tool, das mit seiner eigenen Domain unterschreibt, besteht DKIM, aber nicht DMARC. Deshalb musst du bei solchen Diensten DKIM für deine eigene Domain einrichten. Mehr dazu im Artikel [DKIM einfach erklärt](/wissen/dkim).

## Aufbau eines DMARC-Eintrags

Ein DMARC-Eintrag ist ein TXT-Eintrag im DNS. Er liegt immer unter dem Namen `_dmarc`, also vollständig unter `_dmarc.deine-domain.de`. Der Inhalt besteht aus kurzen Bausteinen, getrennt durch Semikolon.

| Baustein | Bedeutung in Klartext | Beispiel |
|---|---|---|
| `v` | Version. Muss immer vorne stehen und immer `DMARC1` heißen. | `v=DMARC1` |
| `p` | Die Regel für deine Domain: `none` (nur beobachten), `quarantine` (in den Spam), `reject` (ablehnen). | `p=none` |
| `rua` | Wohin Empfänger tägliche Sammelberichte schicken sollen. | `rua=mailto:dmarc@deine-domain.de` |
| `sp` | Eigene Regel für Subdomains wie `shop.deine-domain.de`. Fehlt sie, gilt `p`. | `sp=reject` |
| `adkim` | Wie genau die DKIM-Domain passen muss: `r` locker (Subdomain reicht), `s` streng (exakt gleich). Standard ist `r`. | `adkim=r` |
| `aspf` | Dasselbe für SPF. Standard ist `r`. | `aspf=r` |
| `t` | Testmodus: `t=y` bittet Empfänger, die Regel eine Stufe milder anzuwenden. | `t=y` |
| `pct` | Älterer Baustein für „Regel nur auf einen Teil der Mails anwenden“. Im aktuellen Standard (RFC 9989, Mai 2026) nicht mehr enthalten, schadet aber nicht. | `pct=100` |

Für fast alle Fälle brauchst du nur `v`, `p` und eventuell `rua`. Die übrigen Bausteine lässt du weg, dann gelten die Standardwerte.

## Beispiel-Einträge zum Kopieren

Ersetze `deine-domain.de` durch deine Domain. Als Name (auch „Host“ oder „Präfix“ genannt) trägst du bei fast allen Anbietern nur `_dmarc` ein, die Domain ergänzt das System selbst.

**Start: nur beobachten.** Keine Mail wird blockiert, du bekommst aber Berichte.

```
v=DMARC1; p=none; rua=mailto:dmarc@deine-domain.de
```

**Zwischenschritt: verdächtige Mails in den Spam.**

```
v=DMARC1; p=quarantine; rua=mailto:dmarc@deine-domain.de
```

**Ziel: gefälschte Mails ablehnen.**

```
v=DMARC1; p=reject; rua=mailto:dmarc@deine-domain.de
```

**Domain, die nie Mails verschickt** (zum Beispiel eine reine Weiterleitungs-Domain). Hier kannst du direkt streng sein:

```
v=DMARC1; p=reject
```

Das Postfach bei `rua` muss existieren. Liegt es auf einer anderen Domain, braucht diese Domain einen zusätzlichen Freigabe-Eintrag. Am einfachsten nimmst du eine Adresse auf derselben Domain.

## DMARC-Eintrag anlegen: so geht's

Die Oberfläche sieht bei jedem Anbieter anders aus, die Schritte sind aber immer dieselben:

1. **Herausfinden, wo dein DNS liegt.** Das ist der Anbieter, bei dem die Nameserver deiner Domain eingetragen sind. Oft ist es der Hoster der Domain, nicht der Postfach-Anbieter.
2. **Die DNS-Einstellungen der Domain öffnen.** Der Menüpunkt heißt meist „DNS“, „DNS-Einstellungen“ oder „DNS-Records“.
3. **Prüfen, ob es schon einen Eintrag gibt.** Such nach einem TXT-Eintrag mit dem Namen `_dmarc`. Manche Anbieter, etwa STRATO, setzen eine eigene Standardregel. Gibt es schon einen, bearbeitest du ihn, statt einen zweiten anzulegen.
4. **Neuen TXT-Eintrag anlegen.** Name: `_dmarc`. Wert: einer der Beispiel-Einträge von oben. Die Lebensdauer (TTL) kannst du auf dem Standardwert lassen.
5. **Speichern und warten.** Je nach Anbieter ist der Eintrag nach wenigen Minuten bis einigen Stunden weltweit sichtbar.
6. **Prüfen.** Mit dem [DMARC-Check](/dmarc-check) siehst du, ob der Eintrag gefunden wird und was er bedeutet.

## Was bedeutet „DMARC fail“?

Taucht in einer Fehlermeldung oder einem Bericht „DMARC fail“ auf, heißt das: Weder SPF noch DKIM haben für eine Domain bestanden, die zur „Von“-Adresse passt. Das hat fast immer einen von drei Gründen:

- **Ein Versender fehlt.** Ein Dienst verschickt Mails mit deiner Domain, steht aber weder im SPF-Eintrag noch unterschreibt er mit deinem DKIM-Schlüssel.
- **Fremde Domain.** Der Dienst unterschreibt mit seiner eigenen Domain, etwa bei Microsoft 365 ohne aktiviertes DKIM. SPF und DKIM bestehen dann zwar, passen aber nicht zu deiner Adresse.
- **Echte Fälschung.** Jemand verschickt Mails in deinem Namen. Genau dafür ist DMARC da.

Die ersten beiden Fälle findest du mit einer [Testmail an unseren Mail-Tester](/) aus dem betroffenen System. Das Ergebnis zeigt, welcher Prüfpunkt durchfällt und mit welcher Domain unterschrieben wurde.

## Der sichere Weg: von none zu reject

Wer direkt mit `p=reject` startet, riskiert, dass eigene Mails verschwinden. Typisch sind das Kontaktformular der Website, die Rechnungen aus der Buchhaltungssoftware oder der Newsletter. Wenn diese Dienste nicht sauber in SPF oder DKIM eingetragen sind, lehnen Empfänger sie ab, und niemand merkt es.

Deshalb empfehlen Google und Microsoft einen stufenweisen Weg:

1. **Alle Versender sammeln.** Wer verschickt Mails mit deiner Domain? Postfach-Anbieter, Website, Shop, Newsletter-Tool, CRM, Buchhaltung.
2. **SPF und DKIM für jeden Versender einrichten.** Prüf das mit einer [Testmail an unseren Mail-Tester](/) aus jedem System, das Mails verschickt.
3. **Mit `p=none` starten** und ein paar Wochen Berichte sammeln.
4. **Auf `p=quarantine` wechseln**, wenn in den Berichten keine eigenen Versender mehr durchfallen.
5. **Auf `p=reject` wechseln**, wenn auch danach alles ruhig bleibt.

Bleib nicht für immer bei `p=none`. Die Regel erfüllt zwar die Mindestanforderung der großen Anbieter, schützt deine Domain aber nicht vor Fälschungen.

## Ist DMARC Pflicht?

Gesetzlich nicht. Aber die beiden größten Postfach-Anbieter verlangen es von Vielversendern:

- **Gmail** verlangt seit dem **1. Februar 2024** von allen Absendern, die mehr als 5.000 Mails pro Tag an Gmail-Adressen schicken, SPF, DKIM und einen DMARC-Eintrag. Die Regel darf auf `p=none` stehen. Die „Von“-Adresse muss zur SPF- oder DKIM-Domain passen.
- **Microsoft** stellt seit **Mai 2025** dieselben Grundanforderungen an Vielversender, die mehr als 5.000 Mails pro Tag an Outlook.com, Hotmail und Live schicken: SPF, DKIM und DMARC mit mindestens `p=none`, passend zu SPF oder DKIM.

Für kleinere Absender gibt es keine feste Pflicht. Spamfilter werten die Signale aber bei allen Absendern aus. Eine Domain ohne DMARC wirkt weniger vertrauenswürdig. In unserem Mail-Test kostet ein fehlender DMARC-Eintrag deshalb 1,5 Punkte.

## DMARC-Berichte kurz erklärt

Mit dem Baustein `rua` bitten Empfänger wie Gmail oder Microsoft darum, dir regelmäßig Sammelberichte zu schicken. Darin steht, welche Server Mails mit deiner Domain verschickt haben und ob SPF und DKIM bestanden wurden. Inhalte oder Empfängeradressen stehen nicht darin.

Die Berichte kommen als gepackte XML-Dateien und sind für Menschen schwer lesbar. Für kleine Domains reicht es oft, sie in den ersten Wochen grob durchzusehen oder ein Auswertungs-Tool zu nutzen. Wichtig ist eine Frage: Taucht ein Dienst auf, den du kennst, der aber durchfällt? Dann fehlt er in SPF oder DKIM.

Nicht jeder Anbieter verschickt Berichte. STRATO zum Beispiel verschickt aus Datenschutzgründen keine DMARC-Berichte.

## Häufige Fehler

- **Zwei DMARC-Einträge.** Gibt es unter `_dmarc` mehr als einen Eintrag, ignorieren Empfänger beide. Lösch den alten.
- **Falscher Name.** Der Eintrag gehört unter `_dmarc`, nicht unter `@` oder den Domainnamen allein. Manche Anbieter hängen die Domain automatisch an. Trägst du `_dmarc.deine-domain.de` ein, entsteht daraus `_dmarc.deine-domain.de.deine-domain.de`.
- **Tippfehler in der Version.** `v=dmarc1` oder `v=DMARC` funktioniert nicht. Es muss exakt `v=DMARC1` heißen.
- **Direkt mit reject starten**, ohne alle Versender zu kennen.
- **Für immer bei none bleiben.** Dann fehlt der eigentliche Schutz.

Ob dein Eintrag stimmt, siehst du in Sekunden mit dem [DMARC-Check](/dmarc-check). Er übersetzt deine Regel in Klartext und meldet doppelte Einträge.

## So richtest du DMARC bei deinem Anbieter ein

Der Weg zum DNS-Eintrag sieht bei jedem Anbieter etwas anders aus. Manche setzen sogar schon eine Standardregel. Wähl deinen Anbieter:

- [DMARC bei IONOS einrichten](/anleitung/ionos/dmarc)
- [DMARC bei STRATO einrichten](/anleitung/strato/dmarc)
- [DMARC bei ALL-INKL einrichten](/anleitung/all-inkl/dmarc)
- [DMARC bei Microsoft 365 einrichten](/anleitung/microsoft-365/dmarc)
- [DMARC bei Google Workspace einrichten](/anleitung/google-workspace/dmarc)
- [SPF, DKIM und DMARC bei Hetzner einrichten](/anleitung/hetzner/spf-dkim-dmarc)

Wie DMARC mit SPF und DKIM zusammenspielt, erklärt der [Überblick SPF, DKIM und DMARC](/wissen/spf-dkim-dmarc). Danach lohnt sich eine echte [Testmail an unseren Mail-Tester](/): Sie zeigt dir, ob alle drei Prüfpunkte grün sind.
