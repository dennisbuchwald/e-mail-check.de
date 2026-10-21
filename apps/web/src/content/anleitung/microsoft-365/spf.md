---
titel: "SPF-Eintrag für Microsoft 365 richtig setzen"
seoTitel: "Microsoft 365 SPF-Eintrag: richtig setzen und prüfen"
beschreibung: "Der richtige SPF-Eintrag für Microsoft 365, wo du ihn einträgst und wie du weitere Versender ergänzt, ohne das Limit zu sprengen."
keyword: "spf office 365"
anbieter: "microsoft-365"
anbieterName: "Microsoft 365"
themen: ["spf"]
dauer: "10 Minuten"
kurzantwort: "Bei Microsoft 365 setzt du den SPF-Eintrag nicht im Microsoft-Portal, sondern dort, wo deine Domain liegt (zum Beispiel bei IONOS oder STRATO). Für reine Microsoft-365-Mails lautet er v=spf1 include:spf.protection.outlook.com -all. Du musst nur etwas tun, wenn der Eintrag fehlt, doppelt ist oder ein weiterer Versender wie ein Newsletter-Tool dazukommt."
schritte:
  spf:
    - text: "Finde heraus, wo deine Domain liegt (DNS-Verwaltung). Dort setzt du den Eintrag, nicht in Microsoft 365."
    - text: "Öffne die **DNS-Einstellungen** deiner Domain und suche einen TXT-Eintrag, der mit **v=spf1** beginnt."
    - text: "Gibt es schon einen, ergänze nur **include:spf.protection.outlook.com**. Gibt es keinen, lege diesen TXT-Eintrag an:"
      eintrag:
        typ: "TXT"
        host: "{domain}"
        wert: "v=spf1 include:spf.protection.outlook.com -all"
    - text: "Prüfe, dass es danach genau **einen** SPF-Eintrag gibt. Zwei Einträge machen SPF ungültig."
    - text: "Speichern, etwas warten und mit dem SPF-Check oder einer Testmail prüfen."
faq:
  - frage: "Wie lautet der SPF-Eintrag für Office 365?"
    antwort: "Für Microsoft 365 und Office 365 lautet er v=spf1 include:spf.protection.outlook.com -all. Nutzt du weitere Versender, kommen deren include- oder ip4-Angaben vor das -all. Es darf trotzdem nur ein einziger SPF-Eintrag pro Domain existieren."
  - frage: "Soll ich -all oder ~all verwenden?"
    antwort: "Microsoft empfiehlt -all, wenn nur Microsoft 365 verschickt und DKIM und DMARC laufen. Verschicken weitere Dienste mit deiner Domain, etwa Google, dein Hoster oder ein Newsletter-Tool, nimm zuerst ~all. So empfehlen es Google und der Branchenverband M3AAWG. Auf -all wechselst du erst, wenn die DMARC-Berichte zeigen, dass alle Versender bestehen."
  - frage: "Kann ich SPF im Microsoft 365 Admin Center einstellen?"
    antwort: "Nein. Microsoft 365 hat kein Portal für SPF-Einträge deiner eigenen Domain. Du legst den TXT-Eintrag bei dem Anbieter an, der deine DNS-Einstellungen verwaltet. Ausnahme: Liegt die Domain bei einem Anbieter mit Domain Connect wie IONOS, kann Microsoft die Einträge beim Hinzufügen der Domain automatisch setzen lassen."
  - frage: "Was passiert, wenn ich zwei SPF-Einträge habe?"
    antwort: "Dann kann der Empfänger nicht entscheiden, welcher gilt, und SPF schlägt komplett fehl (permerror). Führe alle Angaben in einem Eintrag zusammen und lösche den zweiten."
quelle:
  - titel: "Microsoft Learn: Einrichten von SPF für Ihre Microsoft 365-Domäne"
    url: "https://learn.microsoft.com/de-de/defender-office-365/email-authentication-spf-configure"
  - titel: "Microsoft Learn: Hinzufügen einer Domäne zu Microsoft 365 (Domain Connect)"
    url: "https://learn.microsoft.com/de-de/microsoft-365/admin/setup/add-domain"
  - titel: "Google Workspace Admin-Hilfe: SPF einrichten (Empfehlung ~all)"
    url: "https://knowledge.workspace.google.com/admin/security/set-up-spf?hl=de"
  - titel: "M3AAWG: Email Authentication Recommended Best Practices (2020)"
    url: "https://www.m3aawg.org/sites/default/files/doc_files/m3aawg-email-authentication-recommended-best-practices-09-2020.pdf"
stand: "2026-10-21"
geprueft: false
offenePunkte:
  - "Microsoft nennt IONOS, Cloudflare, Plesk u. a. als Domain-Connect-Anbieter, die DNS-Einträge automatisch setzen. Nicht dokumentiert ist, ob dabei ein vorhandener SPF-Eintrag ergänzt oder ein zweiter angelegt wird. Mit einer Test-Domain prüfen."
  - "SPF-Linie (~all bei mehreren Versendern, -all nur bei reinem Microsoft 365 mit DKIM und DMARC) mit Dennis bestätigen."
  - "Links auf Hoster-Anleitungen (/anleitung/ionos/spf usw.) setzen voraus, dass diese Seiten zum Launch online sind."
---

## Vorher prüfen

Bevor du etwas änderst, schau nach, was schon da ist. Gib deine Domain im [SPF-Check](/spf-check) ein. Du siehst sofort, ob es einen SPF-Eintrag gibt, ob Microsoft 365 darin steht und wie viele Abfragen er verbraucht.

Noch genauer ist der [Mail-Test](/): Schick aus Outlook eine Mail an deine Testadresse. Der Prüfpunkt **Absender bestätigt** zeigt dir, ob SPF für genau diese Mail passt. Was SPF überhaupt macht, erklärt dir die Seite [Was ist ein SPF-Eintrag?](/wissen/spf).

## Schritt für Schritt

**1. Den richtigen Ort finden.** Microsoft 365 verschickt deine Mails, aber deine Domain liegt meistens woanders: bei IONOS, STRATO, ALL-INKL oder einem anderen Hoster. Genau dort, in den DNS-Einstellungen deiner Domain, setzt du den SPF-Eintrag. Laut Microsoft gibt es in Microsoft 365 selbst keine Einstellung dafür.

Eine Ausnahme gibt es beim Hinzufügen der Domain: Unterstützt dein Anbieter Domain Connect, kann Microsoft 365 die nötigen DNS-Einträge dort automatisch anlegen lassen. Microsoft nennt dafür unter anderem IONOS, Cloudflare und Plesk. Prüf danach trotzdem, ob es nur einen SPF-Eintrag gibt.

Je nach Hoster findest du die passenden Klicks hier:

- [SPF-Eintrag bei IONOS setzen](/anleitung/ionos/spf)
- [SPF-Eintrag bei STRATO setzen](/anleitung/strato/spf)
- [SPF-Eintrag bei ALL-INKL setzen](/anleitung/all-inkl/spf)
- [SPF, DKIM und DMARC bei Hetzner](/anleitung/hetzner/spf-dkim-dmarc)

**2. Vorhandenen Eintrag suchen.** Öffne die DNS-Einstellungen und such nach einem TXT-Eintrag, der mit `v=spf1` beginnt. Viele Hoster legen so einen Eintrag automatisch an. Den änderst du, statt einen zweiten anzulegen.

**3. Microsoft 365 eintragen.** Laufen alle Mails nur über Microsoft 365, sieht der Eintrag so aus:

```
v=spf1 include:spf.protection.outlook.com -all
```

Als Host oder Name trägst du je nach Oberfläche `@` ein oder lässt das Feld leer. Beides meint die Domain selbst, also `deine-domain.de`.

**4. Speichern und warten.** DNS-Änderungen brauchen etwas Zeit, bis sie überall ankommen. Microsoft empfiehlt für SPF-Einträge eine TTL von mindestens 3600 Sekunden (eine Stunde).

## Sonderfall: weitere Versender

Fast jede Firma verschickt nicht nur über Outlook. Die Website schickt Formular-Mails, ein Newsletter-Tool verschickt Kampagnen, die Buchhaltung Rechnungen. Jeder dieser Versender muss im selben SPF-Eintrag stehen.

So sieht ein Eintrag mit eigenem Server und Microsoft 365 aus (Beispiel-IP):

```
v=spf1 ip4:203.0.113.10 include:spf.protection.outlook.com ~all
```

Die Angabe für dein Newsletter-Tool findest du in dessen Hilfe, meist als `include:…`. Sie kommt vor das `~all`.

Warum hier `~all` statt `-all`? Microsoft empfiehlt `-all`, Google dagegen `~all`, ebenso der Branchenverband M3AAWG. Unsere Linie: Verschickt nur Microsoft 365 und laufen DKIM und DMARC, nimm `-all`. Sobald weitere Dienste dazukommen, startest du mit `~all`. Fehlt ein Versender, landet dessen Mail dann eher im Spam statt abgelehnt zu werden. Die eigentliche Schutzwirkung übernimmt DMARC. Auf `-all` wechselst du, wenn die DMARC-Berichte zeigen, dass alle Versender bestehen.

Ein typischer Fall aus der Praxis: Die Website liegt bei IONOS, die Postfächer bei Microsoft 365, das Kontaktformular verschickt über den IONOS-Server. Dann müssen sowohl Microsoft als auch IONOS im Eintrag stehen. Fehlt IONOS, landen die Formular-Anfragen im Spam, obwohl Outlook-Mails sauber ankommen. Welche Angabe dein Hoster braucht, steht in dessen Anleitung, etwa [SPF bei IONOS](/anleitung/ionos/spf).

Microsoft empfiehlt außerdem, Massen-Mails über eine eigene Subdomain zu schicken, zum Beispiel `news.deine-domain.de`. Die Subdomain braucht dann einen eigenen SPF-Eintrag. Vorteil: Probleme mit dem Newsletter schaden nicht dem Ruf deiner normalen Geschäftsmails.

## Danach testen

Prüf den neuen Eintrag direkt im [SPF-Check](/spf-check). Danach schickst du eine echte Mail über den [Mail-Test](/). Steht **Absender bestätigt** auf Grün, passt SPF.

SPF ist nur ein Teil. Damit deine Mails zuverlässig ankommen, brauchst du auch die digitale Unterschrift und eine Schutzregel:

- [DKIM in Microsoft 365 einrichten](/anleitung/microsoft-365/dkim)
- [DMARC für Microsoft 365 einrichten](/anleitung/microsoft-365/dmarc)

Alle Anbieter im Überblick findest du unter [Anleitungen pro Anbieter](/anleitung).

## Typische Fehler und Lösungen

| Problem | Ursache | Lösung |
|---|---|---|
| SPF meldet „permerror“ | Zwei TXT-Einträge mit `v=spf1` | Alles in einen Eintrag zusammenführen, den zweiten löschen |
| SPF meldet „permerror“ trotz einem Eintrag | Mehr als 10 DNS-Abfragen | Versender auf eine Subdomain auslagern oder unnötige Einträge entfernen |
| Formular-Mails landen im Spam | Webserver fehlt im SPF | IP oder include des Webservers ergänzen |
| Eintrag wird nicht erkannt | Tippfehler | Kein Punkt am Ende, Doppelpunkt statt Gleichheitszeichen, kein Leerzeichen nach `include:` |

Zur 10er-Grenze: Jedes `include`, `a`, `mx`, `exists` und `redirect` zählt als Abfrage, auch verschachtelte. Reine `ip4`- und `ip6`-Angaben zählen nicht. Microsoft rät davon ab, den eigenen Eintrag durch feste IP-Adressen zu ersetzen, weil sich die Microsoft-Server häufig ändern.
