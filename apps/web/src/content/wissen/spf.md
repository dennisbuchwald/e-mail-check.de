---
titel: "SPF-Eintrag einfach erklärt"
seoTitel: "SPF-Eintrag erklärt: So sieht er aus, so erstellst du ihn"
beschreibung: "Was ein SPF-Eintrag ist, wie er aussieht und wie du ihn richtig setzt. Mit Beispielen und den häufigsten Fehlern in Klartext."
keyword: "spf eintrag"
kurz: "Ein SPF-Eintrag ist eine Liste in deinem DNS, die festlegt, welche Server Mails für deine Domain verschicken dürfen. Er ist ein TXT-Eintrag, der mit v=spf1 beginnt, zum Beispiel v=spf1 include:_spf.google.com ~all. Fehlt ein Versender auf der Liste, landen seine Mails schnell im Spam."
faq:
  - frage: "Wie muss ein SPF-Eintrag aussehen?"
    antwort: "Ein SPF-Eintrag ist ein TXT-Eintrag direkt auf deiner Domain (Name @ oder leer). Er beginnt mit v=spf1, dann folgen die erlaubten Versender, zum Beispiel include:_spf.google.com, und am Ende ~all oder -all. Pro Domain darf es nur einen SPF-Eintrag geben."
  - frage: "Wie funktioniert ein SPF-Eintrag?"
    antwort: "Der empfangende Server schaut nach, von welchem Server die Mail kommt, und fragt dann den SPF-Eintrag der Absenderdomain ab. Steht der Server auf der Liste, ist der Absender bestätigt. Steht er nicht drauf, entscheidet das Ende des Eintrags (~all oder -all), wie streng der Empfänger reagieren soll."
  - frage: "Wie kann ich meinen SPF-Eintrag abfragen?"
    antwort: "Mit unserem SPF-Check: Domain eingeben, und du siehst alle erlaubten Versender in Klartext, die Zahl der DNS-Abfragen und typische Fehler. Ob SPF bei einer echten Mail besteht, zeigt dir der Mail-Test mit einer Testmail."
  - frage: "Was ist SPF?"
    antwort: "SPF steht für Sender Policy Framework. Es ist ein Standard, mit dem eine Domain öffentlich festlegt, welche Server in ihrem Namen Mails verschicken dürfen. Empfänger nutzen ihn, um gefälschte Absender zu erkennen."
quelle:
  - titel: "RFC 7208: Sender Policy Framework (SPF)"
    url: "https://www.rfc-editor.org/rfc/rfc7208.html"
  - titel: "Microsoft Learn: SPF zum Identifizieren gültiger E-Mail-Quellen einrichten"
    url: "https://learn.microsoft.com/de-de/defender-office-365/email-authentication-spf-configure"
  - titel: "Google Workspace: SPF einrichten"
    url: "https://knowledge.workspace.google.com/admin/security/set-up-spf?hl=de"
  - titel: "IONOS: Spam-Versand vermeiden mit SPF-Record"
    url: "https://www.ionos.de/hilfe/domains/mailserver-und-verwandte-records-konfigurieren/spam-versand-vermeiden-mit-spf-record/"
  - titel: "ALL-INKL: SPF-Eintrag im KAS"
    url: "https://all-inkl.com/wichtig/anleitungen/kas/tools/dns-werkzeuge/spf_482.html"
stand: "2026-10-21"
reihenfolge: 2
---

## SPF in einem Satz

SPF ist die Gästeliste deiner Domain: Nur Server, die darauf stehen, dürfen Mails mit deiner Domain verschicken. Kommt eine Mail von einem Server, der nicht auf der Liste steht, wird der Empfänger misstrauisch.

In unserem Mail-Test heißt dieser Prüfpunkt **Absender bestätigt**. Der Fachbegriff SPF steht für Sender Policy Framework.

## Wie funktioniert SPF?

Jede Mail hat zwei Absender. Den einen siehst du im Postfach im Feld „Von“. Den anderen, die technische Absenderadresse (auch Return-Path oder Envelope-From genannt), sieht nur der Mailserver. SPF prüft diese technische Adresse:

1. Eine Mail kommt beim Empfänger an, verschickt vom Server mit der IP-Adresse `203.0.113.10`.
2. Der Empfänger liest die technische Absenderdomain, zum Beispiel `deine-domain.de`.
3. Er fragt den SPF-Eintrag von `deine-domain.de` ab.
4. Steht `203.0.113.10` (direkt oder über einen Baustein) auf der Liste, ist SPF bestanden.

Weil SPF nur die technische Adresse prüft, schützt es allein nicht vor gefälschten „Von“-Adressen. Dafür braucht es zusätzlich DMARC. Wie die drei zusammenspielen, erklärt der [Überblick SPF, DKIM und DMARC](/wissen/spf-dkim-dmarc).

## Wie sieht ein SPF-Eintrag aus?

Ein SPF-Eintrag ist ein TXT-Eintrag direkt auf deiner Domain. Als Name trägst du je nach Anbieter `@` ein oder lässt das Feld leer. Ein typisches Beispiel für eine Domain, die über Google Workspace mailt und zusätzlich ein Kontaktformular auf dem eigenen Webserver hat:

```
v=spf1 a include:_spf.google.com ~all
```

Zerlegt bedeutet das:

| Teil | Klartext |
|---|---|
| `v=spf1` | „Das hier ist ein SPF-Eintrag.“ Muss immer vorne stehen. |
| `a` | Der Server, auf den deine Domain zeigt (meist der Webserver), darf senden. |
| `include:_spf.google.com` | Alle Server, die Google für Gmail nutzt, dürfen senden. Google pflegt diese Liste selbst. |
| `~all` | Alle anderen Server: verdächtig, aber nicht hart ablehnen. |

## Die Bausteine im Überblick

| Baustein | Bedeutung | Zählt als DNS-Abfrage? |
|---|---|---|
| `include:` | Übernimmt die Liste eines anderen Anbieters, zum Beispiel deines Newsletter-Tools. | ja |
| `a` | Erlaubt die IP-Adresse, auf die deine Domain zeigt. | ja |
| `mx` | Erlaubt die Server, die deine Mails empfangen (MX-Einträge). | ja |
| `ip4:` / `ip6:` | Erlaubt eine feste IP-Adresse oder einen Bereich, zum Beispiel `ip4:203.0.113.10`. | nein |
| `redirect=` | Verweist komplett auf den SPF-Eintrag einer anderen Domain. | ja |
| `~all` | Ende der Liste. Alle anderen: „Softfail“, also verdächtig. | nein |
| `-all` | Ende der Liste. Alle anderen: „Fail“, also nicht erlaubt. | nein |

**~all oder -all?** Beides ist üblich. Mit `~all` werden fremde Server als verdächtig markiert, mit `-all` als klar nicht erlaubt. Google nutzt in seinen Beispielen `~all`, Microsoft empfiehlt für Microsoft 365 `-all`. Wenn du DMARC nutzt, entscheidet am Ende ohnehin deine DMARC-Regel, was mit durchgefallenen Mails passiert. Wichtiger als das Ende ist, dass die Liste vollständig ist.

Finger weg von `+all`: Damit darf jeder Server der Welt Mails mit deiner Domain verschicken.

## SPF-Eintrag erstellen in 4 Schritten

### 1. Alle Versender sammeln

Schreib auf, wer alles Mails mit deiner Domain verschickt. Oft sind es mehr, als man denkt:

- dein Postfach-Anbieter (IONOS, STRATO, Microsoft 365, Google Workspace …)
- das Kontaktformular oder der Shop auf deiner Website
- ein Newsletter-Tool
- Buchhaltungs-, Rechnungs- oder CRM-Software, die in deinem Namen schreibt

### 2. Die passenden Bausteine heraussuchen

Jeder Dienst nennt in seiner Hilfe den Wert, den du eintragen sollst. Für die großen Postfach-Anbieter sind das:

| Anbieter | Baustein für den SPF-Eintrag |
|---|---|
| IONOS | `include:_spf-eu.ionos.com` |
| ALL-INKL | `include:spf.kasserver.com` |
| Google Workspace | `include:_spf.google.com` |
| Microsoft 365 | `include:spf.protection.outlook.com` |

Bei STRATO und Hetzner hängt der Wert von der gewählten Einstellung ab. Das erklären die Anleitungen für [STRATO](/anleitung/strato/spf) und [Hetzner](/anleitung/hetzner/spf-dkim-dmarc).

### 3. Alles in einen Eintrag schreiben

Alle Bausteine kommen in **einen** Eintrag, getrennt durch Leerzeichen. Beispiel für Microsoft 365 plus ein Newsletter-Tool:

```
v=spf1 include:spf.protection.outlook.com include:spf.newsletter-tool.example ~all
```

Den Newsletter-Baustein hier ersetzt du durch den echten Wert deines Tools. Beispiel für eine Domain bei ALL-INKL, wie ALL-INKL ihn selbst vorschlägt:

```
v=spf1 a mx include:spf.kasserver.com ~all
```

### 4. Eintragen und prüfen

Trag den Wert beim Anbieter ein, der deine DNS-Einträge verwaltet. Das ist nicht immer dein Postfach-Anbieter: Liegt die Domain bei IONOS und die Mails laufen über Microsoft 365, trägst du den Microsoft-Baustein bei IONOS ein.

Danach prüfst du den Eintrag mit dem [SPF-Check](/spf-check). Ob eine echte Mail besteht, zeigt eine [Testmail an unseren Mail-Tester](/). Änderungen im DNS können je nach Anbieter bis zu 48 Stunden brauchen, meist geht es deutlich schneller.

Ein Tipp für Agenturen: Notier dir für jede Kunden-Domain, welche Versender im SPF-Eintrag stehen und warum. Wer in einem Jahr ein neues Tool anbindet oder ein altes kündigt, weiß dann sofort, welcher Baustein dazukommt oder raus kann. Veraltete Bausteine sind harmlos, kosten aber Abfragen und öffnen im schlimmsten Fall einem längst gekündigten Dienst die Tür.

## SPF-Eintrag Beispiele für typische Fälle

**Nur IONOS-Postfächer, Domain liegt bei einem anderen DNS-Anbieter:**

```
v=spf1 include:_spf-eu.ionos.com ~all
```

**Microsoft 365 für die Postfächer, dazu ein Kontaktformular auf einem Webserver mit fester IP-Adresse:**

```
v=spf1 include:spf.protection.outlook.com ip4:203.0.113.10 -all
```

**Google Workspace für die Postfächer, Kontaktformular verschickt über das Google-Postfach (SMTP):**

```
v=spf1 include:_spf.google.com ~all
```

Hier muss das Formular nicht extra auf die Liste, weil es über Googles Server sendet. Das ist meist die sauberste Lösung für Kontaktformulare.

**Domain, die nie Mails verschickt.** Auch solche Domains sollten einen SPF-Eintrag haben, damit niemand sie für Fälschungen nutzt:

```
v=spf1 -all
```

## Was die SPF-Ergebnisse bedeuten

Im Kopfbereich einer Mail oder in einem Testergebnis tauchen englische Begriffe auf. Übersetzt heißen sie:

| Ergebnis | Klartext |
|---|---|
| `pass` | Der Server steht auf der Liste. Alles gut. |
| `softfail` | Der Server steht nicht auf der Liste, der Eintrag endet mit `~all`. Verdächtig. |
| `fail` | Der Server steht nicht auf der Liste, der Eintrag endet mit `-all`. Nicht erlaubt. |
| `neutral` | Der Eintrag macht keine Aussage über diesen Server (`?all`). |
| `none` | Die Domain hat gar keinen SPF-Eintrag. |
| `permerror` | Der Eintrag ist kaputt: zwei Einträge, Tippfehler oder mehr als 10 Abfragen. |
| `temperror` | Vorübergehender DNS-Fehler. Meist löst sich das von selbst. |

Für dich zählt vor allem: `softfail` und `fail` heißen „Versender fehlt“, `permerror` heißt „Eintrag reparieren“.

## Die 10-Abfragen-Grenze

Jedes `include`, `a`, `mx` und `redirect` löst beim Empfänger eine DNS-Abfrage aus. Ein `include` kann intern weitere Abfragen enthalten. Der SPF-Standard erlaubt insgesamt höchstens **10 solcher Abfragen**. Wer darüber liegt, bekommt einen Fehler („permerror“), und SPF gilt für alle Mails als nicht bestanden.

Die Grenze ist schneller erreicht, als man denkt: Microsoft 365, ein Newsletter-Tool, ein CRM und ein Ticketsystem können zusammen schon zu viel sein. Was hilft:

- Bausteine entfernen, die du nicht mehr nutzt.
- `a` und `mx` weglassen, wenn über diese Server keine Mails rausgehen.
- Für Newsletter und Massenversand eine eigene Subdomain nutzen, etwa `news.deine-domain.de`. Die bekommt einen eigenen SPF-Eintrag mit eigener Grenze. Das empfiehlt auch Microsoft.

Der [SPF-Check](/spf-check) zählt die Abfragen für dich und zeigt „x von 10“.

## SPF für Subdomains

Ein SPF-Eintrag gilt nur für genau die Domain, auf der er steht. `deine-domain.de` und `news.deine-domain.de` sind für SPF zwei verschiedene Absender. Verschickt dein Newsletter-Tool mit Adressen wie `info@news.deine-domain.de`, braucht die Subdomain einen eigenen Eintrag, zum Beispiel:

```
v=spf1 include:spf.newsletter-tool.example ~all
```

Den Baustein ersetzt du wieder durch den echten Wert deines Tools. Der Vorteil dieser Trennung: Der Newsletter verbraucht keine Abfragen im Haupteintrag, und wenn mit dem Massenversand etwas schiefgeht, leidet der Ruf deiner Hauptdomain weniger.

Subdomains, die keine Mails verschicken, brauchen keinen eigenen SPF-Eintrag. Wer ganz sicher gehen will, schützt sie mit DMARC: Der Baustein `sp` legt die Regel für alle Subdomains fest. Mehr dazu im Artikel [DMARC-Eintrag einfach erklärt](/wissen/dmarc).

## Häufige Fehler

- **Zwei SPF-Einträge.** Pro Domain darf es nur einen Eintrag geben, der mit `v=spf1` beginnt. Gibt es zwei, ist SPF ungültig. Das passiert oft, wenn ein neuer Dienst einen Eintrag „hinzufügen“ lässt, statt den bestehenden zu ergänzen. Lösung: beide zu einem zusammenführen.
- **Versender fehlt.** Der häufigste Fehler überhaupt. Die Mails aus dem Postfach kommen an, die aus dem Kontaktformular oder dem Newsletter-Tool landen im Spam.
- **Zu viele Abfragen.** Siehe oben.
- **Tippfehler.** `v=spf1` falsch geschrieben, `include:` ohne Doppelpunkt, ein Punkt oder Anführungszeichen am Ende, die beim Kopieren mitgerutscht sind.
- **Eintrag auf der falschen Ebene.** SPF gehört direkt auf die Domain. Subdomains wie `shop.deine-domain.de` brauchen einen eigenen Eintrag, wenn sie Mails verschicken.
- **Eintrag beim falschen Anbieter.** Gepflegt wird SPF dort, wo die Nameserver deiner Domain liegen.

## So setzt du SPF bei deinem Anbieter

Bei IONOS, STRATO, ALL-INKL und Hetzner ist SPF für die eigenen Mailserver meist schon gesetzt. Du musst nur etwas tun, wenn ein weiterer Versender dazukommt. Bei Google Workspace und Microsoft 365 legst du den Eintrag selbst an. Die Anleitungen zeigen dir den genauen Weg:

- [SPF-Eintrag bei IONOS setzen](/anleitung/ionos/spf)
- [SPF-Eintrag bei STRATO setzen](/anleitung/strato/spf)
- [SPF-Eintrag bei ALL-INKL setzen](/anleitung/all-inkl/spf)
- [SPF für Microsoft 365 einrichten](/anleitung/microsoft-365/spf)
- [SPF für Google Workspace einrichten](/anleitung/google-workspace/spf)
- [SPF, DKIM und DMARC bei Hetzner einrichten](/anleitung/hetzner/spf-dkim-dmarc)

SPF allein reicht heute nicht mehr. Lies als Nächstes, wie die [Mail-Unterschrift DKIM](/wissen/dkim) und die [Schutzregel DMARC](/wissen/dmarc) funktionieren.
