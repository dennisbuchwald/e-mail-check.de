---
titel: "DMARC bei STRATO: Standardregel behalten oder eigene anlegen?"
seoTitel: "STRATO DMARC einrichten: Standardregel oder eigene?"
beschreibung: "STRATO setzt DMARC automatisch. Wann das reicht, wann du eine eigene Regel brauchst und wie du sie im Kunden-Login einträgst."
keyword: "strato dmarc"
anbieter: "strato"
anbieterName: "STRATO"
themen: ["dmarc"]
dauer: "10 Minuten"
kurzantwort: "Bei STRATO ist DMARC bereits automatisch aktiv: Für deine Domain gilt die STRATO Standard DMARC-Regel. Du musst nur etwas tun, wenn du eine eigene Regel festlegen willst, zum Beispiel weil ein Newsletter-Tool in deinem Namen verschickt oder du Berichte von großen Mailanbietern bekommen möchtest."
schritte:
  dmarc:
    - text: "Erst prüfen, ob du überhaupt etwas ändern musst: Die **STRATO Standard DMARC-Regel** ist schon aktiv."
    - text: "Für eine eigene Regel im Kunden-Login die **Domainverwaltung** öffnen, beim **Zahnrad** den Reiter **DNS** wählen."
    - text: "Bei DMARC **Keine STRATO-DMARC-Regel** auswählen."
    - text: "Einen TXT-Eintrag mit Präfix **_dmarc** anlegen. Die Report-Adresse ist optional und muss ein Postfach sein, das du liest."
      eintrag:
        typ: "TXT"
        host: "_dmarc"
        wert: "v=DMARC1; p=none; rua=mailto:dmarc@{domain}"
    - text: "Mit **Einstellung übernehmen** speichern und nach einigen Stunden mit einer Testmail prüfen."
faq:
  - frage: "Warum zeigt mein DMARC-Check bei STRATO eine Regel, die ich nie angelegt habe?"
    antwort: "Das ist die STRATO Standard DMARC-Regel. STRATO aktiviert sie automatisch für deine Domain. Du kannst sie behalten oder durch eine eigene Regel ersetzen."
  - frage: "Bekomme ich bei STRATO DMARC-Reports?"
    antwort: "Von STRATO selbst nicht: Der STRATO-Mailserver verschickt aus Datenschutzgründen keine DMARC-Reports. Trägst du eine Report-Adresse ein, schicken dir andere große Mailanbieter ihre Berichte. STRATO rät Einsteigern allerdings davon ab."
  - frage: "Wie komme ich zur STRATO-Standardregel zurück?"
    antwort: "Das geht nur, wenn kein TXT-Eintrag mit dem Präfix _dmarc mehr existiert. Lösche deinen eigenen Eintrag also zuerst über den Button Löschen und wähle danach wieder die STRATO-Regel."
  - frage: "Wie lange dauert es, bis der DMARC-Eintrag bei STRATO wirkt?"
    antwort: "Die DMARC-FAQ von STRATO nennt keine Zeit. Für DNS-Änderungen allgemein gibt STRATO bis zu 24 Stunden an. Teste nach ein paar Stunden und notfalls am nächsten Tag noch einmal."
quelle:
  - titel: "STRATO FAQ: DMARC bei STRATO aktivieren"
    url: "https://www.strato.de/faq/hosting/dmarc-bei-strato-aktivieren/"
  - titel: "STRATO FAQ: Wie kann ich bei STRATO meine DNS-Einträge verwalten?"
    url: "https://www.strato.de/faq/domains/wie-kann-ich-bei-strato-meine-dns-eintraege-verwalten/"
stand: "2026-10-21"
geprueft: false
offenePunkte:
  - "Welche Policy nutzt die STRATO Standard DMARC-Regel (none, quarantine oder reject)? Die FAQ sagt es nicht eindeutig. Per DMARC-Check einer STRATO-Domain ermitteln und ergänzen."
  - "Oberfläche prüfen: Wird der eigene _dmarc-Eintrag im DMARC-Bereich oder unter TXT- und CNAME-Records angelegt, und wo genau sitzt der Button Einstellung übernehmen?"
  - "Weitere STRATO-FAQ https://www.strato.de/faq/hosting/DMARC-Policy/ noch nicht ausgewertet."
---

## Vorher prüfen: Welche Regel gilt gerade?

Gib deine Domain im [DMARC-Check](/dmarc-check) ein. Bei STRATO findest du dort fast immer schon einen Eintrag, auch wenn du nie etwas angelegt hast. Das ist die **STRATO Standard DMARC-Regel**. Der Check zeigt dir, welche Regel sie gerade setzt.

Ob deine Mails die Regel bestehen, siehst du mit einer echten Mail. Schick über den [Mail-Test](/) eine Testmail aus deinem STRATO-Postfach. Unter **Schutzregel** steht, ob DMARC passt. Die Grundlagen erklären wir in [DMARC einfach erklärt](/wissen/dmarc).

## Schritt für Schritt: Eigene DMARC-Regel bei STRATO anlegen

Verschickst du nur über STRATO und ist der Test grün, kannst du die Standardregel einfach behalten. Willst du eine eigene Regel, gehst du so vor:

1. Melde dich im STRATO Kunden-Login an und öffne **Domains** und **Domainverwaltung**.
2. Klick bei deiner Domain auf das **Zahnrad** und wähle den Reiter **DNS**.
3. Wähle bei DMARC die Option **Keine STRATO-DMARC-Regel**.
4. Leg einen eigenen Eintrag an: Typ **TXT**, Präfix `_dmarc`, Wert siehe unten.
5. Klick auf **Einstellung übernehmen**.
6. Wiederhole das für jede weitere Domain, für die eine eigene Regel gelten soll.

STRATO zeigt in seiner Hilfe als Beispiel `p=quarantine`. Für den Start empfehlen wir die vorsichtigere Regel `p=none`, so wie Google und Microsoft es raten:

```
v=DMARC1; p=none; rua=mailto:dmarc@deine-domain.de
```

| Regel | Was passiert mit Mails, die DMARC nicht bestehen |
|---|---|
| `p=none` | Werden normal zugestellt. Gut zum Beobachten. |
| `p=quarantine` | Werden als Spam behandelt. |
| `p=reject` | Werden abgelehnt, der Absender bekommt eine Meldung. |

### Berichte: ja oder nein?

Der Teil `rua=mailto:…` bittet Empfänger, dir Sammelberichte zu schicken. STRATO selbst verschickt aus Datenschutzgründen keine solchen Berichte und rät Einsteigern davon ab, sie zu aktivieren. Andere große Mailanbieter schicken sie aber. Sie helfen dir zu sehen, ob ein vergessener Dienst in deinem Namen verschickt. Wenn du sie willst, leg dafür ein eigenes Postfach an. Wenn nicht, lass den `rua`-Teil einfach weg:

```
v=DMARC1; p=none
```

### Zurück zur STRATO-Regel

Das geht nur, wenn kein TXT-Eintrag mit dem Präfix `_dmarc` mehr existiert. Lösch deinen eigenen Eintrag also zuerst über den Button **Löschen**.

## Sonderfall: Ein weiterer Dienst verschickt Mails für dich

Hier kann die automatische Standardregel zur Falle werden. DMARC prüft jede Mail mit deiner Domain als Absender, egal über welchen Server sie kommt. Verschickt ein Newsletter-Tool, Microsoft 365 oder ein Kontaktformular in deinem Namen, muss dieser Dienst SPF oder DKIM passend zu deiner Domain bestehen. Sonst greift die Regel, und seine Mails landen je nach Einstellung im Spam oder werden abgelehnt.

Typisches Bild: Deine STRATO-Mails kommen an, der Newsletter landet aber plötzlich im Spam. So gehst du vor:

1. Liste alle Dienste auf, die mit deiner Adresse verschicken.
2. Nimm jeden in deinen SPF-Eintrag auf: [SPF-Eintrag bei STRATO setzen](/anleitung/strato/spf).
3. Richte für jeden Dienst DKIM mit deiner Domain ein: [DKIM bei STRATO einrichten](/anleitung/strato/dkim).
4. Schick aus jedem Dienst eine Testmail an den [Mail-Test](/). Erst wenn **Schutzregel** überall grün ist, verschärfst du deine eigene Regel auf `p=quarantine` und später `p=reject`.

## Danach testen

Prüf nach ein paar Stunden mit dem [DMARC-Check](/dmarc-check), ob deine eigene Regel statt der STRATO-Regel erscheint. STRATO nennt für DNS-Änderungen bis zu 24 Stunden. Eine Testmail über den [Mail-Test](/) zeigt dir, ob deine Mails die Regel bestehen. Alle Anbieter findest du in der [Übersicht der Anleitungen](/anleitung).

## Typische Fehler und Lösungen

| Meldung | Bedeutung | Lösung |
|---|---|---|
| Alte Regel wird weiter angezeigt | Die STRATO-Regel ist noch ausgewählt oder die Änderung ist noch nicht verteilt. | **Keine STRATO-DMARC-Regel** wählen, bis zu 24 Stunden warten. |
| Zurückwechseln geht nicht | Es existiert noch ein eigener `_dmarc`-Eintrag. | Eigenen Eintrag löschen, dann STRATO-Regel wählen. |
| DMARC fail beim Newsletter | Das Tool besteht weder SPF noch DKIM für deine Domain. | Tool in SPF ergänzen und DKIM im Tool einrichten. |
| Keine Berichte | STRATO verschickt keine, andere nur bei gültiger Adresse. | `rua`-Adresse prüfen oder bewusst ohne Berichte arbeiten. |
