---
titel: "DKIM in Google Workspace einrichten: Schlüssel erzeugen und aktivieren"
seoTitel: "Google Workspace DKIM einrichten: Schritt für Schritt"
beschreibung: "So aktivierst du DKIM in Google Workspace: Schlüssel in der Admin-Konsole erzeugen, Eintrag setzen, Authentifizierung starten."
keyword: "google workspace dkim"
anbieter: "google-workspace"
anbieterName: "Google Workspace"
themen: ["dkim"]
dauer: "15 Minuten plus bis zu 48 Stunden Wartezeit"
kurzantwort: "Bei Google Workspace ist DKIM für deine eigene Domain nicht automatisch aktiv, und genau das ist der häufigste Fehler. Du erzeugst den Schlüssel in der Admin-Konsole, trägst ihn als TXT-Eintrag bei deinem Domain-Anbieter ein und klickst erst danach auf Authentifizierung starten."
schritte:
  dkim:
    - text: "Admin-Konsole öffnen: **Menü** > **Apps** > **Google Workspace** > **Gmail** > **E-Mail authentifizieren** (Superadmin nötig)."
    - text: "Domain wählen, **Neuen Eintrag erstellen** klicken, Schlüssellänge **2.048** und Präfix **google** lassen, **Erstellen**."
    - text: "Bei deinem Domain-Anbieter einen TXT-Eintrag mit Host **google._domainkey** anlegen. Wert aus der Admin-Konsole kopieren."
    - text: "Erst wenn der Eintrag gespeichert ist: in der Admin-Konsole **Authentifizierung starten** klicken."
    - text: "Bis zu 48 Stunden warten, dann eine Testmail an eine fremde Adresse schicken und prüfen."
faq:
  - frage: "Ist DKIM bei Google Workspace automatisch aktiv?"
    antwort: "Nein, nicht für deine eigene Domain. Du musst den Schlüssel in der Admin-Konsole erzeugen, im DNS eintragen und die Authentifizierung starten. Bis dahin besteht deine Domain die DKIM-Prüfung nicht."
  - frage: "Was trage ich als Host für DKIM bei Google ein?"
    antwort: "Den Präfix plus ._domainkey, standardmäßig also google._domainkey. Den Wert, der mit v=DKIM1 beginnt, kopierst du aus der Admin-Konsole. Er ist für jede Domain anders."
  - frage: "Warum kann ich noch keinen DKIM-Schlüssel erzeugen?"
    antwort: "Google verlangt, dass Gmail für die Domain 24 bis 72 Stunden aktiv ist, bevor du den Schlüssel erzeugen kannst. Bei einem frisch eingerichteten Workspace musst du also etwas warten."
  - frage: "Wie prüfe ich, ob Google meine Mails signiert?"
    antwort: "Schick eine Mail an eine fremde Adresse, nicht an dich selbst. Am einfachsten an die Adresse im Mail-Test von e-mail-check.de. Der Prüfpunkt Mail unterschrieben zeigt dann, ob die Unterschrift zu deiner Domain passt."
quelle:
  - titel: "Google Workspace Admin-Hilfe: DKIM einrichten"
    url: "https://knowledge.workspace.google.com/admin/security/set-up-dkim?hl=de"
stand: "2026-10-21"
geprueft: false
offenePunkte:
  - "Button-Bezeichnung „Neuen Eintrag erstellen“ laut Hilfeseite, in der echten Admin-Konsole prüfen."
  - "Google nennt kein konkretes Zeichenlimit für TXT-Einträge. Ob IONOS, STRATO, ALL-INKL den 2.048-Bit-Schlüssel ohne Aufteilen annehmen, in der jeweiligen Oberfläche prüfen."
  - "Links auf Hoster-Anleitungen (/anleitung/ionos/dkim usw.) setzen voraus, dass diese Seiten zum Launch online sind."
---

## Vorher prüfen

Schick aus Gmail eine Mail an deine Adresse im [Mail-Test](/). Der Prüfpunkt **Mail unterschrieben** zeigt, ob die Unterschrift zu deiner Domain gehört. Ohne Einrichtung fehlt sie dort.

Ohne Testmail geht es mit dem [DKIM-Check](/dkim-check). Er sucht automatisch nach dem Selektor `google`, den Workspace standardmäßig nutzt. Wie DKIM funktioniert, erklärt [Was ist DKIM?](/wissen/dkim).

## Schritt für Schritt

Du brauchst ein Superadmin-Konto. Gmail muss für deine Domain seit 24 bis 72 Stunden aktiv sein, sonst lässt Google dich noch keinen Schlüssel erzeugen.

**1. Bereich öffnen.** In der Admin-Konsole öffnest du das Menü und klickst auf **Apps** > **Google Workspace** > **Gmail** > **E-Mail authentifizieren**.

**2. Schlüssel erzeugen.** Wähl deine Domain aus und klick auf **Neuen Eintrag erstellen**. Als Schlüssellänge nimmst du **2.048**. Nur wenn dein Domain-Anbieter so lange Einträge nicht annimmt, nimmst du 1.024. Den Präfix lässt du auf `google`. Mit **Erstellen** speicherst du.

Google zeigt dir jetzt zwei Werte: den Host `google._domainkey` und einen langen Wert, der mit `v=DKIM1; k=rsa; p=` beginnt. Lass das Fenster offen.

**3. TXT-Eintrag beim Domain-Anbieter anlegen.** Öffne in einem zweiten Tab die DNS-Einstellungen deiner Domain. Leg einen TXT-Eintrag an:

| Host / Name | Typ | Wert |
|---|---|---|
| `google._domainkey` | TXT | Wert aus der Admin-Konsole kopieren |

Die Klicks für deinen Hoster: [DKIM bei IONOS](/anleitung/ionos/dkim), [DKIM bei STRATO](/anleitung/strato/dkim), [DKIM bei ALL-INKL](/anleitung/all-inkl/dkim), [Hetzner](/anleitung/hetzner/spf-dkim-dmarc).

**4. Authentifizierung starten.** Erst jetzt, wenn der Eintrag gespeichert ist, gehst du zurück in die Admin-Konsole und klickst auf **Authentifizierung starten**. Klickst du vorher, findet Google den Schlüssel nicht.

Ein Hinweis zum Kopieren: Der Wert ist sehr lang. Markiere ihn komplett, ohne Zeilenumbrüche oder fehlende Zeichen am Ende. Schon ein abgeschnittenes Zeichen macht die Unterschrift ungültig.

**5. Warten.** Laut Google kann es bis zu 48 Stunden dauern, bis DKIM greift. So lange kann auch der Hinweis „Sie müssen die DNS-Einträge für diese Domain aktualisieren“ stehen bleiben. Ist alles fertig, zeigt die Admin-Konsole „E-Mail wird mit DKIM authentifiziert“.

## Sonderfall: weitere Versender und alter Hoster

DKIM gilt pro Versender. Google unterschreibt nur Mails, die über Gmail rausgehen. Dein Newsletter-Tool oder dein Kontaktformular braucht eine eigene DKIM-Einrichtung mit eigenem Selektor. Die Werte bekommst du vom jeweiligen Dienst.

Hast du mehrere Domains in Google Workspace, wiederholst du die Schritte für jede einzelne. Jede Domain bekommt ihren eigenen Schlüssel und ihren eigenen TXT-Eintrag.

Liegt deine Domain bei einem Hoster wie IONOS oder STRATO, hat dieser oft eigene DKIM-Einträge für seinen Mailserver angelegt. Solange du über den Hoster keine Mails mehr verschickst, schaden sie nicht. Lösch sie nicht vorschnell, falls das Kontaktformular der Website noch darüber läuft.

Gibt es für deine Domain schon einen Schlüssel mit dem Präfix `google`, wählst du laut Google einen anderen Präfix. Hoster-Einträge heißen anders und kommen sich mit `google` nicht in die Quere.

## Danach testen

Google rät: Test nicht an dich selbst schicken, sondern an eine fremde Adresse. Nimm dafür den [Mail-Test](/). Ist **Mail unterschrieben** grün und nennt deine Domain, passt alles. Den Eintrag selbst prüfst du im [DKIM-Check](/dkim-check).

Danach kommt die Schutzregel: [DMARC für Google Workspace](/anleitung/google-workspace/dmarc). Kontrolliere auch den [SPF-Eintrag für Google Workspace](/anleitung/google-workspace/spf). Alle Anbieter findest du unter [Anleitungen pro Anbieter](/anleitung).

## Typische Fehler und Lösungen

| Problem | Ursache | Lösung |
|---|---|---|
| Schlüssel lässt sich nicht erzeugen | Gmail ist erst kurz aktiv | 24 bis 72 Stunden warten |
| Authentifizierung startet nicht | DNS-Eintrag fehlt noch oder ist noch nicht sichtbar | Eintrag prüfen, warten, erneut klicken |
| Eintrag wird abgelehnt oder abgeschnitten | Anbieter begrenzt die Länge von TXT-Einträgen | Beim Anbieter nachsehen, ob lange Werte möglich sind, sonst 1.024 Bit wählen |
| Test zeigt keine DKIM-Zeile | Mail ist nicht signiert, Authentifizierung noch nicht gestartet | In der Admin-Konsole prüfen, ob „E-Mail wird mit DKIM authentifiziert“ angezeigt wird |
| Check findet nichts | Host doppelt, etwa `google._domainkey.deine-domain.de.deine-domain.de` | Nur `google._domainkey` eintragen, wenn der Anbieter die Domain anhängt |
