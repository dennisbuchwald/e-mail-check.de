---
titel: "SPF-Eintrag für Google Workspace richtig einrichten"
seoTitel: "Google Workspace SPF-Eintrag: richtig einrichten"
beschreibung: "Der richtige SPF-Eintrag für Google Workspace, wo er hingehört und wie du Kontaktformular oder Newsletter-Tool ergänzt."
keyword: "google workspace spf"
anbieter: "google-workspace"
anbieterName: "Google Workspace"
themen: ["spf"]
dauer: "10 Minuten"
kurzantwort: "Bei Google Workspace ist SPF nicht automatisch eingerichtet. Du setzt den Eintrag nicht in der Admin-Konsole, sondern bei dem Anbieter, der deine Domain verwaltet. Für reine Gmail-Mails lautet er v=spf1 include:_spf.google.com ~all, weitere Versender kommen in denselben Eintrag."
schritte:
  spf:
    - text: "Sammle alle Dienste, die mit deiner Domain Mails verschicken: Gmail, Kontaktformular, Newsletter-Tool, Rechnungsprogramm."
    - text: "Öffne die **DNS-Einstellungen** bei dem Anbieter, bei dem deine Domain liegt. In der Admin-Konsole ist nichts einzustellen."
    - text: "Gibt es schon einen TXT-Eintrag mit **v=spf1**, ergänze nur **include:_spf.google.com**. Sonst diesen Eintrag anlegen:"
      eintrag:
        typ: "TXT"
        host: "{domain}"
        wert: "v=spf1 include:_spf.google.com ~all"
    - text: "Weitere Versender ins **selbe** Feld schreiben, vor das ~all. Es darf nur einen SPF-Eintrag geben."
    - text: "Bis zu 48 Stunden warten, dann mit dem SPF-Check oder einer Testmail prüfen."
faq:
  - frage: "Wie lautet der SPF-Eintrag für Google Workspace?"
    antwort: "Wenn nur Google Workspace Mails verschickt, lautet er v=spf1 include:_spf.google.com ~all. Als Host trägst du @ ein. Andere Versender ergänzt du im selben Eintrag, zum Beispiel mit einem weiteren include."
  - frage: "Muss ich in der Google Admin-Konsole etwas einstellen?"
    antwort: "Nein. SPF besteht nur aus einem TXT-Eintrag in den DNS-Einstellungen deiner Domain. Den legst du bei deinem Domain-Anbieter an, etwa bei IONOS oder STRATO. In der Admin-Konsole gibt es dafür keinen Schalter."
  - frage: "Wie lange dauert es, bis SPF wirkt?"
    antwort: "Laut Google kann es bis zu 48 Stunden dauern, bis die SPF-Prüfung greift. Oft geht es deutlich schneller. Teste am besten nach einer Stunde und noch einmal am nächsten Tag."
  - frage: "Brauchen Subdomains einen eigenen SPF-Eintrag?"
    antwort: "Ja, wenn du von einer Subdomain wie news.deine-domain.de Mails verschickst. Der Eintrag der Hauptdomain gilt nicht automatisch für Subdomains."
quelle:
  - titel: "Google Workspace Admin-Hilfe: SPF einrichten"
    url: "https://knowledge.workspace.google.com/admin/security/set-up-spf?hl=de"
  - titel: "Microsoft Learn: SPF für Microsoft 365 (Empfehlung -all)"
    url: "https://learn.microsoft.com/de-de/defender-office-365/email-authentication-spf-configure"
  - titel: "M3AAWG: Email Authentication Recommended Best Practices (2020)"
    url: "https://www.m3aawg.org/sites/default/files/doc_files/m3aawg-email-authentication-recommended-best-practices-09-2020.pdf"
stand: "2026-10-21"
geprueft: false
offenePunkte:
  - "SPF-Linie (~all bei mehreren Versendern laut Google und M3AAWG, -all nur bei einem einzigen Dienst mit DKIM und DMARC laut Microsoft) mit Dennis bestätigen."
  - "Links auf Hoster-Anleitungen (/anleitung/ionos/spf usw.) setzen voraus, dass diese Seiten zum Launch online sind."
---

## Vorher prüfen

Gib deine Domain im [SPF-Check](/spf-check) ein. Du siehst, ob schon ein SPF-Eintrag existiert und ob Google darin vorkommt. Viele Hoster legen automatisch einen Eintrag für ihren eigenen Mailserver an. Nach dem Umzug zu Google Workspace steht dann oft noch der alte Hoster drin, Google aber nicht.

Am genauesten ist der [Mail-Test](/): Schick aus Gmail eine Mail an deine Testadresse und schau auf den Prüfpunkt **Absender bestätigt**. Grundlagen findest du unter [Was ist ein SPF-Eintrag?](/wissen/spf).

## Schritt für Schritt

**1. Versender sammeln.** Google rät, vor dem Eintragen alle Dienste aufzuschreiben, die mit deiner Domain Mails schicken. Typisch sind: Gmail selbst, das Kontaktformular der Website, ein Newsletter-Tool, ein Shop oder ein Rechnungsprogramm.

**2. DNS-Einstellungen öffnen.** Den SPF-Eintrag setzt du dort, wo deine Domain verwaltet wird. Die passenden Klicks für deinen Hoster:

- [SPF-Eintrag bei IONOS setzen](/anleitung/ionos/spf)
- [SPF-Eintrag bei STRATO setzen](/anleitung/strato/spf)
- [SPF-Eintrag bei ALL-INKL setzen](/anleitung/all-inkl/spf)
- [SPF, DKIM und DMARC bei Hetzner](/anleitung/hetzner/spf-dkim-dmarc)

**3. Eintrag anlegen oder ändern.** Lege einen TXT-Eintrag an. Als Host trägst du `@` ein, wenn es um die Domain selbst geht (manche Oberflächen lassen das Feld dafür leer). Der Wert für reine Google-Mails:

```
v=spf1 include:_spf.google.com ~all
```

Existiert schon ein Eintrag mit `v=spf1`, legst du keinen zweiten an. Du ergänzt nur `include:_spf.google.com` vor dem `~all`.

**4. Warten.** Laut Google kann es bis zu 48 Stunden dauern, bis SPF wirkt. Ändere in der Zeit nicht ständig am Eintrag, sonst weißt du nicht, welche Fassung gerade geprüft wird.

## Sonderfall: weitere Versender

Jeder Dienst, der mit deiner Domain Mails verschickt, muss im selben Eintrag stehen. Google zeigt dafür zwei Beispiele.

Google Workspace und Amazon SES:

```
v=spf1 include:_spf.google.com include:amazonses.com ~all
```

Google Workspace und Microsoft 365:

```
v=spf1 include:_spf.google.com include:spf.protection.outlook.com ~all
```

Für dein Newsletter-Tool oder deinen Webserver bekommst du die passende Angabe vom jeweiligen Anbieter. Läuft das Kontaktformular über den Server deines Hosters, ergänzt du dessen Angabe, zum Beispiel per `ip4:203.0.113.10`. Google erlaubt bis zu zehn include-Angaben in einem Eintrag. Manche Dienste binden intern weitere Angaben ein, deshalb kann die Grenze schneller erreicht sein, als die Zahl der includes vermuten lässt. Der [SPF-Check](/spf-check) zählt das für dich.

## Danach testen

Prüf den Eintrag im [SPF-Check](/spf-check). Danach eine echte Mail aus Gmail an den [Mail-Test](/) schicken. Ist **Absender bestätigt** grün, passt es. Teste auch das Kontaktformular, indem du es an die Testadresse schicken lässt.

Weiter geht es mit [DKIM in Google Workspace](/anleitung/google-workspace/dkim), dem häufigsten Problem bei Workspace, und danach mit [DMARC für Google Workspace](/anleitung/google-workspace/dmarc). Alle Anbieter findest du unter [Anleitungen pro Anbieter](/anleitung).

## Typische Fehler und Lösungen

| Problem | Ursache | Lösung |
|---|---|---|
| SPF schlägt fehl, obwohl Google drinsteht | Zwei Einträge mit `v=spf1` | Zu einem Eintrag zusammenführen, den anderen löschen |
| Gmail-Mails fallen durch | Nur der alte Hoster steht im Eintrag | `include:_spf.google.com` ergänzen |
| Formular-Mails im Spam | Webserver fehlt im SPF | Angabe des Webservers ergänzen |
| Subdomain ohne SPF | Eintrag gilt nur für die Hauptdomain | Eigenen TXT-Eintrag für die Subdomain anlegen |
| Eintrag wird nicht erkannt | Tippfehler | Kein Punkt am Ende, Doppelpunkt nach `include`, kein Leerzeichen danach |

Ein Hinweis zu `~all`: Google empfiehlt in seiner Anleitung diese weiche Variante. Mails von nicht genannten Servern werden dann nicht abgelehnt, sondern nur als verdächtig markiert. Das ist ein sicherer Start, solange du nicht weißt, ob wirklich alle Versender eingetragen sind. Die eigentliche Schutzwirkung kommt später über DMARC.

Und wenn Microsoft 365 auch im Eintrag steht? Microsoft empfiehlt für reine Microsoft-365-Domains `-all`. Sobald zwei Dienste mit deiner Domain verschicken, bleib bei `~all`. Das empfiehlt auch der Branchenverband M3AAWG, weil ein hartes `-all` bei manchen Empfängern zur Ablehnung führt, bevor DMARC überhaupt geprüft wird, etwa bei weitergeleiteten Mails.

Häufig passiert der Fehler beim Umzug: Vorher lagen die Postfächer beim Hoster, jetzt bei Google. Der alte Eintrag des Hosters bleibt stehen und Google fehlt. Laufen über den Hoster noch Formular-Mails, lässt du dessen Angabe im Eintrag und ergänzt Google. Wird der Hoster gar nicht mehr zum Verschicken genutzt, kannst du seine Angabe entfernen.
