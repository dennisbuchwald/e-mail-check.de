---
titel: "DMARC für Google Workspace einrichten: einfach und sicher starten"
seoTitel: "Google Workspace DMARC einrichten: einfach erklärt"
beschreibung: "So richtest du DMARC für deine Google-Workspace-Domain ein. Mit Eintrag zum Kopieren und Tipps, wie du sicher startest."
keyword: "google workspace dmarc"
anbieter: "google-workspace"
anbieterName: "Google Workspace"
themen: ["dmarc"]
dauer: "10 Minuten"
kurzantwort: "Bei Google Workspace ist DMARC nicht automatisch aktiv. Du legst bei deinem Domain-Anbieter einen TXT-Eintrag mit dem Namen _dmarc an, nachdem SPF und DKIM laufen. Google empfiehlt den Start mit p=none und einem Berichtspostfach, danach verschärfst du schrittweise."
schritte:
  dmarc:
    - text: "SPF und DKIM für Google Workspace einrichten und danach **48 Stunden** warten."
    - text: "Eine Gruppe oder ein eigenes Postfach für DMARC-Berichte anlegen, zum Beispiel **dmarc@** deiner Domain."
    - text: "In den **DNS-Einstellungen** deines Domain-Anbieters diesen TXT-Eintrag anlegen:"
      eintrag:
        typ: "TXT"
        host: "_dmarc.{domain}"
        wert: "v=DMARC1; p=none; rua=mailto:dmarc@{domain}"
    - text: "Mindestens eine Woche Berichte auswerten. Bestehen alle Versender, auf **p=quarantine** und später **p=reject** umstellen."
faq:
  - frage: "Wie richte ich DMARC für Google Workspace ein?"
    antwort: "Du legst bei deinem Domain-Anbieter einen TXT-Eintrag mit dem Host _dmarc an. In der Google Admin-Konsole musst du dafür nichts einstellen. Vorher sollten SPF und DKIM laufen, Google empfiehlt danach 48 Stunden Wartezeit."
  - frage: "Welche DMARC-Regel soll ich zum Start nehmen?"
    antwort: "Google empfiehlt p=none. Damit werden alle Mails weiter zugestellt, du bekommst aber Berichte. Danach stellst du schrittweise auf quarantine und reject um, optional mit pct für einen Teil der Mails."
  - frage: "Brauche ich ein eigenes Postfach für DMARC-Berichte?"
    antwort: "Google rät dazu, weil je nach Mailmenge viele Berichte eingehen. Nimm eine Gruppe oder ein eigenes Postfach, nicht deine persönliche Adresse. Liegt das Postfach auf einer anderen Domain, braucht diese einen zusätzlichen DNS-Eintrag."
  - frage: "Unterstützt Gmail ruf-Berichte?"
    antwort: "Nein. Laut Google wird ruf in Gmail nicht unterstützt. Für den Überblick reichen die Sammelberichte über rua."
quelle:
  - titel: "Google Workspace Admin-Hilfe: DMARC einrichten"
    url: "https://knowledge.workspace.google.com/admin/security/set-up-dmarc?hl=de"
  - titel: "Google Workspace Admin-Hilfe: Empfohlene DMARC-Einführung"
    url: "https://knowledge.workspace.google.com/admin/security/recommended-dmarc-rollout?hl=de"
stand: "2026-10-21"
geprueft: false
offenePunkte:
  - "Google nennt für die none-Phase eine Woche mit täglicher Berichtsprüfung. Unsere Empfehlung „mindestens eine Woche, besser ein paar Wochen“ mit Dennis abstimmen."
  - "Links auf Hoster-Anleitungen (/anleitung/ionos/dmarc usw.) setzen voraus, dass diese Seiten zum Launch online sind."
---

## Vorher prüfen

Gib deine Domain im [DMARC-Check](/dmarc-check) ein. Du siehst, ob schon ein Eintrag existiert und welche Regel gilt. Liegt deine Domain bei STRATO, kann dort bereits eine Standardregel aktiv sein.

DMARC funktioniert nur, wenn SPF oder DKIM bestehen. Schick deshalb vorher aus Gmail eine Mail an den [Mail-Test](/) und schau auf **Absender bestätigt** und **Mail unterschrieben**. Was DMARC macht, erklärt [Was ist DMARC?](/wissen/dmarc).

## Schritt für Schritt

**1. SPF und DKIM zuerst.** Richte beides ein, falls noch nicht passiert: [SPF-Eintrag für Google Workspace](/anleitung/google-workspace/spf) und [DKIM in Google Workspace](/anleitung/google-workspace/dkim). Google empfiehlt, danach 48 Stunden zu warten, bevor du DMARC aktivierst.

**2. Berichtspostfach anlegen.** Leg in Google Workspace eine Gruppe oder ein eigenes Postfach für die Berichte an, zum Beispiel `dmarc@deine-domain.de`. Google rät von deiner persönlichen Adresse ab.

**3. Drittversender prüfen.** Verschickt ein Newsletter-Tool, Shop oder Kontaktformular Mails mit deiner Domain? Dann muss dieser Dienst SPF oder DKIM mit deiner Domain bestehen. Sonst fällt er später durch DMARC. Am schnellsten prüfst du das, indem du von jedem Dienst eine Mail an den [Mail-Test](/) schicken lässt.

**4. Eintrag beim Domain-Anbieter anlegen.** Der DMARC-Eintrag gehört in die DNS-Einstellungen deiner Domain:

- **Host / Name:** `_dmarc` (manche Anbieter wollen `_dmarc.deine-domain.de`)
- **Typ:** TXT
- **Wert:**

```
v=DMARC1; p=none; rua=mailto:dmarc@deine-domain.de
```

Die Klicks für deinen Hoster: [DMARC bei IONOS](/anleitung/ionos/dmarc), [DMARC bei STRATO](/anleitung/strato/dmarc), [DMARC bei ALL-INKL](/anleitung/all-inkl/dmarc), [Hetzner](/anleitung/hetzner/spf-dkim-dmarc).

**5. Schrittweise verschärfen.** Google empfiehlt, `p=none` mindestens eine Woche laufen zu lassen und die Berichte in der Zeit täglich anzusehen. Wir raten zu ein paar Wochen, damit auch seltene Versender auftauchen. Zeigen die Berichte, dass alle echten Versender bestehen, stellst du um. Mit `pct` gilt die Regel zuerst nur für einen Teil der Mails. Google nennt für kleine Firmen einen Start mit etwa 10 Prozent:

```
v=DMARC1; p=quarantine; pct=10; rua=mailto:dmarc@deine-domain.de
```

Läuft das ohne Probleme, erhöhst du `pct` bis 100 und gehst am Ende auf:

```
v=DMARC1; p=reject; rua=mailto:dmarc@deine-domain.de
```

Was bedeuten die Teile des Eintrags? Eine kurze Übersicht:

| Teil | Bedeutung |
|---|---|
| `v=DMARC1` | Kennzeichnet den Eintrag als DMARC, muss vorne stehen |
| `p=none` | Regel: nichts blockieren, nur beobachten |
| `p=quarantine` | Mails, die durchfallen, landen im Spam |
| `p=reject` | Mails, die durchfallen, werden abgelehnt |
| `pct=10` | Regel gilt nur für 10 Prozent der durchgefallenen Mails |
| `rua=mailto:…` | Adresse für die Sammelberichte |

Google beschreibt außerdem `adkim` und `aspf`. Damit stellst du ein, wie genau die Domains übereinstimmen müssen. Für den Start brauchst du beides nicht.

## Sonderfall: Domain beim Hoster mit eigener Regel

Bei STRATO ist für Domains oft eine automatische DMARC-Regel aktiv. Willst du deinen eigenen Eintrag nutzen, musst du die STRATO-Regel vorher abschalten. Wie das geht, steht in [DMARC bei STRATO einrichten](/anleitung/strato/dmarc).

Laufen über den Hoster noch Formular-Mails der Website, prüfe in den Berichten, ob sie bestehen. Oft fehlt für den Webserver die DKIM-Unterschrift mit deiner Domain. Dann reicht SPF, solange der Webserver im SPF-Eintrag steht.

Wichtig ist auch: Es darf nur einen `_dmarc`-Eintrag geben. Prüf vor dem Anlegen, ob schon einer existiert, und ändere ihn dann statt einen zweiten anzulegen.

## Danach testen

Prüf den Eintrag im [DMARC-Check](/dmarc-check). Dann schick eine Mail aus Gmail an den [Mail-Test](/). Der Prüfpunkt **Schutzregel** zeigt, ob DMARC gefunden wird und ob deine Mail besteht. Alle Anbieter findest du unter [Anleitungen pro Anbieter](/anleitung).

## Typische Fehler und Lösungen

| Problem | Ursache | Lösung |
|---|---|---|
| Kein DMARC gefunden | Host doppelt, etwa `_dmarc.deine-domain.de.deine-domain.de` | Nur `_dmarc` eintragen, wenn der Anbieter die Domain anhängt |
| Zwei Regeln gefunden | Alter Eintrag oder Hoster-Regel aktiv | Nur einen Eintrag behalten |
| Keine Berichte | Postfach fehlt oder liegt auf fremder Domain | Postfach anlegen; fremde Domain braucht einen Freigabe-Eintrag |
| Newsletter landet im Spam | Tool besteht weder SPF noch DKIM mit deiner Domain | DKIM im Tool einrichten, solange `p=none` lassen |
