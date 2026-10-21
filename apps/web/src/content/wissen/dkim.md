---
titel: "Was ist DKIM? Die Mail-Unterschrift einfach erklärt"
seoTitel: "Was ist DKIM? Der DKIM-Eintrag einfach erklärt"
beschreibung: "DKIM ist die digitale Unterschrift deiner Mails. Hier erfährst du, wie sie funktioniert, wie der Eintrag aussieht und wie du sie aktivierst."
keyword: "dkim eintrag"
kurz: "DKIM ist eine digitale Unterschrift, die dein Mailserver an jede ausgehende Mail hängt. Der Empfänger prüft sie mit einem öffentlichen Schlüssel, den du als DKIM-Eintrag im DNS veröffentlichst, zum Beispiel unter google._domainkey.deine-domain.de. Stimmt die Unterschrift, ist klar: Die Mail kommt wirklich von dir und wurde unterwegs nicht verändert."
faq:
  - frage: "Wie muss ein DKIM-Eintrag aussehen?"
    antwort: "Ein DKIM-Eintrag liegt unter einem Namen wie selektor._domainkey.deine-domain.de. Er ist entweder ein TXT-Eintrag, der mit v=DKIM1 beginnt und den öffentlichen Schlüssel nach p= enthält, oder ein CNAME, der auf den Schlüssel deines Anbieters zeigt. Den genauen Wert gibt dir immer dein Mail-Anbieter vor."
  - frage: "Was ist DKIM und wie funktioniert es?"
    antwort: "DKIM steht für DomainKeys Identified Mail. Dein Mailserver unterschreibt jede Mail mit einem geheimen Schlüssel, der Empfänger prüft die Unterschrift mit dem öffentlichen Schlüssel aus deinem DNS. Passt beides zusammen, ist die Mail echt und unverändert."
  - frage: "Wie richte ich DKIM ein?"
    antwort: "Bei IONOS, STRATO und ALL-INKL ist DKIM für die eigenen Mails meist schon aktiv. Bei Google Workspace und Microsoft 365 musst du DKIM selbst aktivieren: Schlüssel im Admin-Bereich erzeugen, DNS-Eintrag setzen, Signatur einschalten. Für Newsletter-Tools gibt dir das Tool die Einträge vor."
  - frage: "Ist DKIM sinnvoll?"
    antwort: "Ja. Gmail und Microsoft werten DKIM bei allen Absendern aus und verlangen es von Vielversendern. DKIM übersteht außerdem Weiterleitungen meist unbeschadet, SPF nicht. Ohne DKIM fehlt die stabilste Grundlage für DMARC."
quelle:
  - titel: "RFC 6376: DomainKeys Identified Mail (DKIM) Signatures"
    url: "https://www.rfc-editor.org/rfc/rfc6376.html"
  - titel: "Google Workspace: DKIM einrichten"
    url: "https://knowledge.workspace.google.com/admin/security/set-up-dkim?hl=de"
  - titel: "Microsoft Learn: DKIM zum Signieren von E-Mails einrichten"
    url: "https://learn.microsoft.com/de-de/defender-office-365/email-authentication-dkim-configure"
  - titel: "IONOS: E-Mail-Authentifizierung mit DKIM"
    url: "https://www.ionos.de/hilfe/domains/mailserver-und-verwandte-records-konfigurieren/e-mail-authentifizierung-mit-dkim/"
  - titel: "Google: Richtlinien für E-Mail-Absender"
    url: "https://support.google.com/a/answer/81126?hl=de"
stand: "2026-10-21"
reihenfolge: 3
---

## DKIM in einem Satz

DKIM ist das Siegel auf deinem Brief: Dein Mailserver unterschreibt jede Mail, und der Empfänger kann prüfen, ob die Unterschrift echt ist und der Inhalt seitdem unverändert blieb.

In unserem Mail-Test heißt dieser Prüfpunkt **Mail unterschrieben**. Der Fachbegriff DKIM steht für DomainKeys Identified Mail.

## Wie funktioniert DKIM?

DKIM arbeitet mit einem Schlüsselpaar, wie ein Briefsiegel und ein öffentlich ausgehängter Abdruck davon:

1. **Geheimer Schlüssel:** Liegt nur auf dem Mailserver, der deine Mails verschickt. Damit erzeugt er für jede Mail eine Unterschrift und schreibt sie in einen unsichtbaren Kopfbereich der Mail (`DKIM-Signature`).
2. **Öffentlicher Schlüssel:** Steht als DKIM-Eintrag in deinem DNS. Jeder kann ihn abrufen.
3. **Prüfung:** Der Empfänger liest aus der Unterschrift, welche Domain unterschrieben hat und welcher Schlüssel benutzt wurde. Dann holt er den öffentlichen Schlüssel aus dem DNS und rechnet nach. Passt alles, ist DKIM bestanden.

Wurde die Mail unterwegs verändert, etwa der Betreff oder der Text, passt die Unterschrift nicht mehr, und DKIM fällt durch.

### Was ist ein Selektor?

Eine Domain kann mehrere DKIM-Schlüssel gleichzeitig haben, zum Beispiel einen für das Postfach und einen für das Newsletter-Tool. Damit der Empfänger den richtigen findet, hat jeder Schlüssel einen Namen: den **Selektor**. Er steht in der Unterschrift jeder Mail (`s=`) und bildet den Namen des DNS-Eintrags:

```
selektor._domainkey.deine-domain.de
```

Typische Selektoren sind `google` bei Google Workspace, `selector1` und `selector2` bei Microsoft 365 oder `s1-ionos` und `s2-ionos` bei IONOS. Du kennst deinen Selektor nicht? Kein Problem: Der [DKIM-Check](/dkim-check) sucht automatisch nach den verbreiteten Selektoren. Noch sicherer ist eine [Testmail an unseren Mail-Tester](/), denn dort steht der Selektor direkt in der Mail.

## Wie sieht ein DKIM-Eintrag aus?

Es gibt zwei Varianten. Welche du brauchst, gibt dein Anbieter vor.

**Variante 1: TXT-Eintrag mit dem Schlüssel.** Der öffentliche Schlüssel steht direkt im DNS. So arbeitet zum Beispiel Google Workspace. Der Eintrag liegt unter `google._domainkey` und sieht gekürzt so aus:

```
v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
```

| Teil | Klartext |
|---|---|
| `v=DKIM1` | „Das hier ist ein DKIM-Schlüssel.“ |
| `k=rsa` | Das Verfahren, mit dem unterschrieben wird. |
| `p=…` | Der öffentliche Schlüssel selbst, eine lange Zeichenkette. Nie von Hand abtippen, immer kopieren. |

**Variante 2: CNAME-Verweis.** Statt des Schlüssels steht im DNS nur ein Verweis auf den Anbieter, der den Schlüssel pflegt. Vorteil: Der Anbieter kann den Schlüssel austauschen, ohne dass du etwas ändern musst. So arbeiten zum Beispiel IONOS und Microsoft 365. Bei IONOS sieht das so aus:

```
s1-ionos._domainkey   CNAME   s1.dkim.ionos.com
s2-ionos._domainkey   CNAME   s2.dkim.ionos.com
```

Google empfiehlt Schlüssel mit 2.048 Bit, 1.024 Bit gelten als Untergrenze.

Welche Variante besser ist, musst du nicht entscheiden. Du übernimmst einfach, was dein Anbieter anzeigt. Wichtig ist nur: Ein Selektor hat genau einen Eintrag. Lege also nicht zusätzlich zu einem CNAME noch einen TXT-Eintrag mit demselben Namen an, sonst kann der Empfänger den Schlüssel nicht sauber lesen.

## Wer aktiviert DKIM?

Ob du selbst etwas tun musst, hängt davon ab, wer deine Mails verschickt:

| Anbieter | DKIM für eigene Mails | Was du tun musst |
|---|---|---|
| IONOS | automatisch aktiv (bei IONOS-Nameservern) | nichts, außer die Domain liegt bei einem anderen DNS-Anbieter |
| STRATO | automatisch aktiv (Versand über STRATO) | nichts für eigene Mails |
| ALL-INKL | automatisch aktiv (eigener Mailserver) | nichts für eigene Mails |
| Hetzner (konsoleH) | nach dem Einschalten in den Mailsicherheits-Einstellungen | DKIM aktivieren, DNS-Eintrag wird bei konsoleH-Nameservern ggf. automatisch gesetzt |
| Google Workspace | nicht aktiv | Schlüssel in der Admin-Konsole erzeugen, TXT-Eintrag setzen, danach „Authentifizierung starten“ |
| Microsoft 365 | nur für die `onmicrosoft.com`-Adresse | im Defender-Portal zwei CNAMEs anlegen und die Signatur einschalten |

Die Falle bei Google Workspace und Microsoft 365: Ohne Aktivierung werden Mails zwar unterschrieben, aber mit einer fremden Domain. DKIM gilt dann als bestanden, die Unterschrift passt aber nicht zu deiner „Von“-Adresse, und DMARC fällt durch. Das ist der häufigste DKIM-Fehler bei diesen beiden Anbietern.

## DKIM für Newsletter-Tools und andere Versender

Jeder Dienst, der Mails in deinem Namen verschickt, braucht seinen eigenen DKIM-Schlüssel für deine Domain. Das gilt für Newsletter-Tools, Shopsysteme, CRM- oder Buchhaltungssoftware.

So gehst du vor:

1. Such im Dienst nach einem Menüpunkt wie „Domain authentifizieren“, „Absenderdomain“ oder „DKIM“.
2. Der Dienst zeigt dir einen oder mehrere DNS-Einträge, meist CNAMEs.
3. Trag sie bei dem Anbieter ein, der deine DNS-Einträge verwaltet.
4. Bestätige im Dienst, dass die Einträge gesetzt sind.
5. Schick aus dem Dienst eine [Testmail an unseren Mail-Tester](/) und prüf den Punkt „Mail unterschrieben“.

Viele Dienste unterschreiben ohne diese Einrichtung mit ihrer eigenen Domain. Das sieht im Test zunächst gut aus, reicht für DMARC aber nicht.

## DKIM einrichten in 4 Schritten

Egal ob Postfach-Anbieter oder Newsletter-Tool, der Ablauf ist fast immer gleich:

1. **Schlüssel erzeugen lassen.** Das macht der Dienst, der deine Mails verschickt, nicht du. Du findest die Funktion im Admin-Bereich, bei Google Workspace zum Beispiel unter „E-Mails authentifizieren“.
2. **DNS-Eintrag setzen.** Den angezeigten Namen und Wert kopierst du in die DNS-Einstellungen deiner Domain, als TXT oder CNAME, so wie der Dienst es vorgibt.
3. **Warten.** Bis der Eintrag überall sichtbar ist, können je nach Anbieter einige Minuten bis 48 Stunden vergehen.
4. **Signatur einschalten.** Bei Google Workspace und Microsoft 365 musst du die Signatur danach ausdrücklich aktivieren. Erst ab diesem Moment unterschreibt der Dienst mit deiner Domain.

## So erkennst du DKIM in einer Mail

Ob eine Mail unterschrieben ist, steht im Quelltext der Mail. In Gmail findest du ihn über das Drei-Punkte-Menü und „Original anzeigen“, in Outlook über die Nachrichtenquelle oder die Nachrichtendetails. Zwei Stellen sind interessant:

- **`DKIM-Signature`:** die Unterschrift selbst. Darin steht `d=` für die unterschreibende Domain und `s=` für den Selektor.
- **`Authentication-Results`:** das Prüfergebnis des Empfängers, zum Beispiel `dkim=pass header.d=deine-domain.de`.

Achte darauf, dass hinter `d=` deine Domain steht und nicht die deines Anbieters. Einfacher geht es mit einer [Testmail an unseren Mail-Tester](/): Der Prüfpunkt „Mail unterschrieben“ zeigt dir in Klartext, ob die Mail gültig und mit deiner Domain unterschrieben ist. Die Rohdaten für Profis findest du ganz unten im Ergebnis.

## Häufige Fehler

- **DKIM nie aktiviert** bei Google Workspace oder Microsoft 365. Siehe oben.
- **„Authentifizierung starten“ zu früh geklickt.** Bei Google Workspace erst klicken, wenn der DNS-Eintrag gesetzt und sichtbar ist.
- **Schlüssel unvollständig kopiert.** Lange Schlüssel werden beim Kopieren gern abgeschnitten oder mit Zeilenumbrüchen versehen. Der Wert muss lückenlos sein.
- **Name doppelt.** Viele Anbieter hängen die Domain automatisch an. Trag nur `google._domainkey` ein, nicht `google._domainkey.deine-domain.de`.
- **Einträge nach Anbieterwechsel gelöscht.** Wer die DNS-Zone neu aufsetzt, verliert oft die DKIM-Einträge. Bei IONOS zum Beispiel musst du sie dann manuell neu anlegen.
- **Check findet nichts, obwohl Mails unterschrieben sind.** Dann nutzt dein Anbieter einen ungewöhnlichen Selektor. Eine Testmail zeigt ihn dir.

In unserem Mail-Test kostet eine fehlende DKIM-Unterschrift 2 Punkte. Ob deine Domain überhaupt einen Schlüssel veröffentlicht, zeigt dir vorab der [DKIM-Check](/dkim-check).

## So richtest du DKIM bei deinem Anbieter ein

- [DKIM bei IONOS einrichten](/anleitung/ionos/dkim)
- [DKIM bei STRATO einrichten](/anleitung/strato/dkim)
- [DKIM bei ALL-INKL einrichten](/anleitung/all-inkl/dkim)
- [DKIM bei Microsoft 365 einrichten](/anleitung/microsoft-365/dkim)
- [DKIM bei Google Workspace einrichten](/anleitung/google-workspace/dkim)
- [SPF, DKIM und DMARC bei Hetzner einrichten](/anleitung/hetzner/spf-dkim-dmarc)

DKIM ist eine von drei Säulen. Die anderen beiden sind der [SPF-Eintrag](/wissen/spf) und die [DMARC-Schutzregel](/wissen/dmarc).
