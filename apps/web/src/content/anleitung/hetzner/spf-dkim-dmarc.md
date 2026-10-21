---
titel: "SPF, DKIM und DMARC bei Hetzner einrichten"
seoTitel: "Hetzner: SPF, DKIM und DMARC einrichten (konsoleH)"
beschreibung: "SPF, DKIM und DMARC bei Hetzner: Was automatisch läuft, wo du DKIM aktivierst und wie du den DMARC-Eintrag in der DNS-Zone anlegst."
keyword: "hetzner dkim"
anbieter: "hetzner"
anbieterName: "Hetzner"
themen: ["spf", "dkim", "dmarc"]
dauer: "20 Minuten"
kurzantwort: "Bei Hetzner-Webhosting mit konsoleH-Nameservern ist SPF automatisch gesetzt, DKIM musst du in den Mailsicherheits-Einstellungen aktivieren, und DMARC legst du selbst als TXT-Eintrag an. Welche Schritte du brauchst, hängt davon ab, wo du deine Domain verwaltest: in konsoleH, in der Hetzner Console oder ganz woanders."
schritte:
  spf:
    - text: "Prüfe, wo deine Domain liegt. Bei **konsoleH-Nameservern** setzt Hetzner automatisch einen Standard-SPF-Eintrag."
    - text: "Verschickst du zusätzlich über Newsletter-Tool, Microsoft 365 oder einen anderen Server, musst du diese Versender im SPF-Eintrag ergänzen."
    - text: "Öffne die DNS-Zone in der **Hetzner Console** unter **DNS** und bearbeite den vorhandenen TXT-Eintrag mit **v=spf1**. Lege keinen zweiten an."
    - text: "Speichern und mit dem SPF-Check oder einer Testmail prüfen."
  dkim:
    - text: "In konsoleH die Einstellungen zur **Mailsicherheit** deiner Domain öffnen."
    - text: "**DKIM aktivieren** wählen. Hetzner erzeugt das Schlüsselpaar automatisch."
    - text: "Bei konsoleH-Nameservern kommt der Eintrag teils automatisch. Sonst Name (z. B. **default_1707._domainkey**) und Wert aus konsoleH beim DNS-Anbieter anlegen."
    - text: "Mit einer Testmail prüfen, ob deine Mails jetzt unterschrieben sind."
  dmarc:
    - text: "DMARC setzt Hetzner nicht automatisch. Richte vorher SPF und DKIM ein."
    - text: "Öffne die DNS-Zone deiner Domain, zum Beispiel in der **Hetzner Console** unter **DNS**. Dort kommt der Wert in Anführungszeichen."
    - text: "Lege diesen TXT-Eintrag an:"
      eintrag:
        typ: "TXT"
        host: "_dmarc.{domain}"
        wert: "v=DMARC1; p=none"
    - text: "Später auf **p=quarantine** oder **p=reject** verschärfen, wenn alle Versender bestehen."
faq:
  - frage: "Ist DKIM bei Hetzner automatisch aktiv?"
    antwort: "Nicht von selbst. Im Webhosting aktivierst du DKIM in den Einstellungen zur Mailsicherheit, dann erzeugt Hetzner den Schlüssel. Bei konsoleH-Nameservern kann der DNS-Eintrag automatisch gesetzt werden, sonst trägst du ihn selbst ein."
  - frage: "Welchen SPF-Eintrag brauche ich bei Hetzner?"
    antwort: "Bei konsoleH-Nameservern setzt Hetzner einen Standard-SPF-Eintrag automatisch. In der Standard-Zone stand laut Hetzner-Doku v=spf1 +a +mx ?all. Du musst nur etwas ändern, wenn du über weitere Dienste verschickst. Schau dir den bestehenden Eintrag an und ergänze ihn, statt einen zweiten anzulegen."
  - frage: "Was ist der Unterschied zwischen konsoleH, Hetzner Console und Robot?"
    antwort: "konsoleH ist die Verwaltung für Webhosting und Managed Server, dort liegen auch die Mail-Einstellungen. Die Hetzner Console verwaltet unter anderem DNS-Zonen. Robot ist für dedizierte Server, dort betreibst du deinen Mailserver selbst."
  - frage: "Wie lege ich einen TXT-Eintrag in der Hetzner Console an?"
    antwort: "Projekt wählen, links im Menü DNS anklicken, die Zone öffnen, beim Typ TXT auswählen, Name und Wert ausfüllen und mit Hinzufügen speichern. Für die Domain selbst steht im Namen ein @, für DMARC _dmarc. Den Wert setzt du laut Hetzner in Anführungszeichen."
quelle:
  - titel: "Hetzner Docs: Mailsicherheit (konsoleH)"
    url: "https://docs.hetzner.com/de/konsoleh/account-management/email/mailsecurity/"
  - titel: "Hetzner Docs: E-Mail-Sicherheit (Managed Server)"
    url: "https://docs.hetzner.com/de/managed/email/email-security/"
  - titel: "Hetzner Docs: TXT-Records in der Hetzner Console verwalten"
    url: "https://docs.hetzner.com/de/dns-console/dns/manage-records/managing-txt-records/"
  - titel: "Hetzner Docs: TXT Record"
    url: "https://docs.hetzner.com/networking/dns/record-types/txt-record/"
  - titel: "Hetzner Docs: DNS-Records in der Hetzner Console hinzufügen"
    url: "https://docs.hetzner.com/de/networking/dns/getting-started/adding-records/"
  - titel: "Hetzner Docs: DNS-Verwaltung in konsoleH"
    url: "https://docs.hetzner.com/de/konsoleh/account-management/configuration/dnsadministration/"
  - titel: "Hetzner Docs (archiviert, Stand 2020): Mailsicherheit in konsoleH mit Selektor-Beispiel"
    url: "https://web.archive.org/web/20251112204201/https://docs.hetzner.com/de/konsoleh/account-management/email/mailsecurity/"
  - titel: "Hetzner Docs (archiviert, Stand 06/2024): DNS-Verwaltung mit Standard-Zone"
    url: "https://web.archive.org/web/20251211214108/https://docs.hetzner.com/de/konsoleh/account-management/configuration/dnsadministration/"
stand: "2026-10-21"
geprueft: false
offenePunkte:
  - "Exakter Klickpfad zur Mailsicherheit in konsoleH ist nirgends dokumentiert. Belegt sind nur die Bezeichnungen „DKIM aktivieren“ und „Erweiterte Einstellungen“ (Doku-Stand 2020). In der echten Oberfläche prüfen."
  - "Standard-SPF v=spf1 +a +mx ?all stammt aus der Hetzner-Doku (Stand 06/2024). Die aktuelle Doku nennt keinen Wert mehr, ein Drittanbieter berichtet v=spf1 mx -all. Per DNS-Abfrage einer frischen konsoleH-Domain gegenprüfen."
  - "Selektor default_1707._domainkey ist das Beispiel aus der Hetzner-Doku (Stand 2020). Ob die Zahl je Domain variiert, in der Oberfläche oder per Mail-Test prüfen."
  - "Robot: keine offizielle Quelle zur DNS-Verwaltung für Mail-Einträge abgerufen, im Text nur allgemein behandelt."
  - "Links auf Hoster-Anleitungen und Microsoft-365-/Workspace-Seiten setzen voraus, dass diese Seiten zum Launch online sind."
---

## Zuerst klären: Wo verwaltest du deine Domain?

Hetzner hat mehrere Oberflächen. Je nachdem, welche du nutzt, sieht dein Weg anders aus.

| Du hast … | Oberfläche | Was für dich gilt |
|---|---|---|
| Webhosting oder Managed Server | **konsoleH** (Mail-Einstellungen), DNS-Einträge in der **Hetzner Console** | SPF automatisch, DKIM per Schalter, DMARC selbst anlegen |
| Nur DNS-Zonen bei Hetzner | **Hetzner Console** (früher DNS Console) | Alle drei Einträge selbst als TXT anlegen, Werte kommen von deinem Mailanbieter |
| Dedizierten Server | **Robot** | Du betreibst den Mailserver selbst, DKIM-Schlüssel kommt aus deiner Mailserver-Software |

Wichtig für Webhosting-Kunden: Die DNS-Einträge selbst bearbeitest du laut Hetzner inzwischen hauptsächlich in der Hetzner Console. In konsoleH verwaltest du nur noch den Zugriff auf die Zone, die Nameserver und kannst die Zone zurücksetzen. Vorsicht mit **Zone zurücksetzen**: Das stellt die Standard-Zone wieder her und löscht alle eigenen Einträge, also auch DKIM und DMARC. Ob du die konsoleH-Nameserver nutzt, erkennst du an `ns1.your-server.de`, `ns.second-ns.com` und `ns3.second-ns.de`.

Liegt deine Domain gar nicht bei Hetzner, sondern zum Beispiel bei IONOS oder STRATO, setzt du die Einträge dort: [SPF bei IONOS](/anleitung/ionos/spf), [DKIM bei STRATO](/anleitung/strato/dkim), [DMARC bei ALL-INKL](/anleitung/all-inkl/dmarc).

## Vorher prüfen

Schick eine Mail von deiner Hetzner-Adresse an den [Mail-Test](/). Nach etwa 30 Sekunden siehst du alle drei Punkte auf einen Blick: **Absender bestätigt** (SPF), **Mail unterschrieben** (DKIM) und **Schutzregel** (DMARC).

Ohne Testmail geht es auch einzeln: [SPF-Check](/spf-check), [DKIM-Check](/dkim-check) und [DMARC-Check](/dmarc-check). Wie die drei zusammenhängen, erklärt [SPF, DKIM und DMARC im Überblick](/wissen/spf-dkim-dmarc).

## SPF: Absender bestätigen

Nutzt du die Nameserver von konsoleH, setzt Hetzner automatisch einen Standard-SPF-Eintrag. Für Mails über dein Hetzner-Postfach musst du nichts tun.

Probleme gibt es laut Hetzner, wenn du zusätzlich über externe Dienste verschickst: ein Newsletter-Tool, Microsoft 365, ein Shop-System. Diese Mailserver müssen in den SPF-Eintrag aufgenommen werden. Wichtig: Es darf nur einen SPF-Eintrag pro Domain geben. Ergänze also den vorhandenen Eintrag, statt einen zweiten anzulegen.

Wie der Standard-Eintrag aussieht, hat Hetzner früher in der Doku zur Standard-Zone gezeigt (Stand 2024):

```
v=spf1 +a +mx ?all
```

Er erlaubt die Server hinter deinen A- und MX-Einträgen, also deinen Hetzner-Server. Das `?all` am Ende ist neutral: Mails von fremden Servern werden weder als Fehler noch als verdächtig gewertet. Microsoft rät von `?all` im Echtbetrieb ab. Wenn du den Eintrag sowieso bearbeitest, ersetz `?all` durch `~all`. Die aktuelle Doku nennt keinen Wert mehr, schau also in deiner Zone nach, was wirklich drinsteht.

Kommt zum Beispiel Microsoft 365 dazu, ergänzt du dessen Angabe im selben Eintrag:

```
v=spf1 +a +mx include:spf.protection.outlook.com ~all
```

Welche Angaben dein Eintrag braucht, hängt von deinen Versendern ab. Mehr zum Aufbau erklärt [Was ist ein SPF-Eintrag?](/wissen/spf).

## DKIM: Mails unterschreiben

Im Webhosting aktivierst du DKIM in den Einstellungen zur Mailsicherheit:

1. Öffne in konsoleH die Einstellungen zur **Mailsicherheit** deiner Domain.
2. Wähle **DKIM aktivieren**. Hetzner erzeugt automatisch ein Schlüsselpaar.
3. Bei konsoleH-Nameservern kann der passende DNS-Eintrag automatisch gesetzt werden.
4. Liegt deine Domain bei einem anderen DNS-Anbieter, zeigt dir konsoleH einen TXT-Eintrag an. Den trägst du dort selbst ein, Name und Wert kopierst du aus konsoleH. Später findest du ihn jederzeit unter **Erweiterte Einstellungen**.

In der Hetzner-Doku sieht der Name des Eintrags zum Beispiel so aus: `default_1707._domainkey`. Der Wert beginnt mit `v=DKIM1; p=` und ist in mehrere Stücke in Anführungszeichen aufgeteilt. Das ist normal, denn ein Stück darf höchstens 255 Zeichen lang sein. Kopier Name und Wert immer aus konsoleH, nicht aus einem Beispiel.

Du kannst statt des automatischen Schlüssels auch einen eigenen verwenden: unter **Erweiterte Einstellungen** einen neuen Schlüssel erstellen und das erzeugte Paar mit deinem eigenen überschreiben. Der private Schlüssel darf laut Hetzner nicht mit einem Passwort geschützt sein.

Hast du nur die DNS-Zone bei Hetzner und verschickst über einen anderen Dienst, bekommst du den DKIM-Wert von diesem Dienst. Für Microsoft 365 und Google Workspace gibt es eigene Anleitungen: [DKIM in Microsoft 365](/anleitung/microsoft-365/dkim) und [DKIM in Google Workspace](/anleitung/google-workspace/dkim). Grundlagen: [Was ist DKIM?](/wissen/dkim).

## DMARC: Schutzregel festlegen

DMARC setzt Hetzner nicht automatisch. Du legst einen TXT-Eintrag in der DNS-Zone an. In der Hetzner Console geht das so:

1. Dein Projekt öffnen und links im Menü **DNS** wählen.
2. Die Zone deiner Domain öffnen.
3. Auf **Typ** klicken und **TXT** auswählen.
4. Name `_dmarc` und den Wert eintragen. Den Wert setzt du laut Hetzner in Anführungszeichen, also `"v=DMARC1; p=none"`.
5. Mit **Hinzufügen** speichern.

Als Wert empfiehlt sich für den Start, wie im Beispiel von Hetzner:

```
v=DMARC1; p=none
```

`p=none` heißt: Mails werden weiter zugestellt, du siehst aber, ob alles passt. Möchtest du Berichte bekommen, ergänzt du eine Adresse:

```
v=DMARC1; p=none; rua=mailto:dmarc@deine-domain.de
```

Hetzner erklärt die drei Regeln so: Bei `none` wird nur ausgewertet, bei `quarantine` kann die Mail als Spam behandelt werden, bei `reject` lehnt der Empfänger sie ab. Verschärfe erst, wenn alle deine Versender SPF oder DKIM bestehen. Mehr dazu in [Was ist DMARC?](/wissen/dmarc).

## Sonderfall: Domain bei Hetzner, Mails über Microsoft 365 oder Google

Das ist häufig: Die Website läuft bei Hetzner, die Postfächer bei Microsoft 365 oder Google Workspace. Dann gilt:

- Im SPF-Eintrag muss der Mailanbieter stehen, zum Beispiel `include:spf.protection.outlook.com` oder `include:_spf.google.com`.
- DKIM aktivierst du beim Mailanbieter, nicht in konsoleH. Die Einträge dafür legst du in deiner Hetzner-Zone an.
- Für Formular-Mails von der Website bleibt der Hetzner-Server Versender und muss ebenfalls im SPF stehen.

Die Schritte findest du in [SPF für Microsoft 365](/anleitung/microsoft-365/spf), [DMARC für Microsoft 365](/anleitung/microsoft-365/dmarc), [SPF für Google Workspace](/anleitung/google-workspace/spf) und [DMARC für Google Workspace](/anleitung/google-workspace/dmarc).

## Danach testen

Schick nach dem Speichern eine neue Mail an den [Mail-Test](/). Alle drei Prüfpunkte sollten grün sein. Bleibt einer rot, prüf ihn gezielt im [SPF-Check](/spf-check), [DKIM-Check](/dkim-check) oder [DMARC-Check](/dmarc-check). Andere Anbieter findest du unter [Anleitungen pro Anbieter](/anleitung).

## Typische Fehler und Lösungen

| Problem | Ursache | Lösung |
|---|---|---|
| SPF ungültig | Zweiter SPF-Eintrag angelegt | Beide zu einem zusammenführen |
| Newsletter im Spam | Externer Versender fehlt im SPF | Angabe des Dienstes ergänzen |
| DKIM fehlt trotz Aktivierung | Domain liegt bei externem DNS-Anbieter | Angezeigten TXT-Eintrag dort selbst anlegen |
| TXT-Wert wird nicht übernommen | Anführungszeichen fehlen oder langer Wert ohne Aufteilung | Wert in Anführungszeichen setzen. Laut Hetzner darf ein Teilstück höchstens 255 Zeichen haben, lange Werte in mehrere Teile in Anführungszeichen aufteilen |
| Eigene Einträge plötzlich weg | In konsoleH „Zone zurücksetzen“ geklickt | DKIM, DMARC und SPF-Ergänzungen neu anlegen |
| DMARC nicht gefunden | Name falsch | Name exakt `_dmarc`, Typ TXT |
