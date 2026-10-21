---
titel: "DMARC für Microsoft 365 einrichten: sicher von none zu reject"
seoTitel: "Microsoft 365 DMARC einrichten: Anleitung in Klartext"
beschreibung: "So richtest du DMARC für deine Microsoft-365-Domain ein: Eintrag zum Kopieren und der sichere Weg von none zu reject."
keyword: "office 365 dmarc"
anbieter: "microsoft-365"
anbieterName: "Microsoft 365"
themen: ["dmarc"]
dauer: "10 Minuten"
kurzantwort: "Bei Microsoft 365 ist DMARC für deine eigene Domain nicht automatisch aktiv. Du legst bei dem Anbieter, der deine Domain verwaltet, einen TXT-Eintrag mit dem Namen _dmarc an. Starte mit p=none und Berichten, prüfe die Ergebnisse und verschärfe die Regel danach schrittweise."
schritte:
  dmarc:
    - text: "Prüfe zuerst, ob SPF und DKIM für deine Domain in Microsoft 365 laufen. Ohne die beiden greift DMARC ins Leere."
    - text: "Leg ein eigenes Postfach oder eine Gruppe für DMARC-Berichte an, zum Beispiel **dmarc@** deiner Domain."
    - text: "Öffne die **DNS-Einstellungen** bei deinem Domain-Anbieter und lege diesen TXT-Eintrag an:"
      eintrag:
        typ: "TXT"
        host: "_dmarc.{domain}"
        wert: "v=DMARC1; p=none; rua=mailto:dmarc@{domain}"
    - text: "Achte darauf, dass es nur **einen** _dmarc-Eintrag gibt."
    - text: "Werte ein paar Wochen die Berichte aus. Dann auf **p=quarantine** und später **p=reject** umstellen."
faq:
  - frage: "Wie richte ich DMARC in Office 365 ein?"
    antwort: "Du legst einen TXT-Eintrag mit dem Namen _dmarc bei dem Anbieter an, der deine Domain verwaltet. In Microsoft 365 selbst gibt es dafür keine Einstellung, außer für die Adresse auf onmicrosoft.com. Ein guter Start ist v=DMARC1; p=none; rua=mailto: plus dein Berichtspostfach."
  - frage: "Sollte ich gleich p=reject setzen?"
    antwort: "Nein. Microsoft empfiehlt den stufenweisen Weg von none über quarantine zu reject. Bei reject werden Mails abgelehnt, die DMARC nicht bestehen. Fehlt noch ein Versender wie dein Newsletter-Tool, kommen dessen Mails dann nicht mehr an."
  - frage: "Was passiert bei quarantine oder reject mit meinen eigenen Mails?"
    antwort: "Schlägt DMARC bei einer Mail aus Microsoft 365 fehl und deine Regel lautet quarantine oder reject, schickt Microsoft diese Mail über einen Pool für riskante Absender. Das lässt sich laut Microsoft nicht abschalten. Deshalb vorher SPF und DKIM sauber einrichten."
  - frage: "Wo stelle ich DMARC für die onmicrosoft.com-Adresse ein?"
    antwort: "Das geht im Microsoft 365 Admin Center bei der Domain auf onmicrosoft.com. Dort legst du einen TXT-Eintrag mit dem Namen _dmarc an. Für deine eigene Domain ist das nicht nötig, weil der Eintrag beim Domain-Anbieter liegt."
quelle:
  - titel: "Microsoft Learn: Einrichten von DMARC zum Überprüfen von E-Mails in Microsoft 365"
    url: "https://learn.microsoft.com/de-de/defender-office-365/email-authentication-dmarc-configure"
stand: "2026-10-21"
geprueft: false
offenePunkte:
  - "Microsoft nennt keine Dauer für die none-Phase. „Ein paar Wochen“ ist unsere Empfehlung, mit Dennis abstimmen."
  - "Menüpfad im Admin Center für onmicrosoft.com ist in der maschinellen Übersetzung unklar (Alle anzeigen > Einstellungen > Domänen), daher im Text nur allgemein genannt."
  - "Links auf Hoster-Anleitungen (/anleitung/ionos/dmarc usw.) setzen voraus, dass diese Seiten zum Launch online sind."
---

## Vorher prüfen

Gib deine Domain im [DMARC-Check](/dmarc-check) ein. Du siehst, ob schon ein Eintrag existiert und welche Regel er nutzt. Manchmal hat der Hoster oder eine frühere Agentur bereits etwas angelegt.

DMARC baut auf SPF und DKIM auf. Prüf deshalb vorher mit dem [Mail-Test](/), ob **Absender bestätigt** und **Mail unterschrieben** grün sind. Was DMARC genau macht, erklärt [Was ist DMARC?](/wissen/dmarc).

## Schritt für Schritt

**1. SPF und DKIM fertig machen.** Wenn eines davon fehlt, richte es zuerst ein: [SPF-Eintrag für Microsoft 365](/anleitung/microsoft-365/spf) und [DKIM in Microsoft 365](/anleitung/microsoft-365/dkim). Gerade DKIM ist bei Microsoft 365 oft nie eingeschaltet worden.

Liegt deine Domain bei STRATO, ist dort oft schon eine automatische DMARC-Regel aktiv. Die musst du erst abschalten, bevor dein eigener Eintrag gilt. Wie das geht, steht in [DMARC bei STRATO](/anleitung/strato/dmarc).

**2. Berichtspostfach anlegen.** Empfänger schicken dir über DMARC regelmäßig Berichte, welche Server in deinem Namen Mails verschickt haben. Microsoft rät, dafür ein eigenes Postfach oder eine Microsoft-365-Gruppe zu nehmen, nicht das Postfach einer Person. Zum Beispiel `dmarc@deine-domain.de`.

**3. Eintrag beim Domain-Anbieter anlegen.** Den DMARC-Eintrag setzt du dort, wo deine DNS-Einstellungen liegen. Leg einen TXT-Eintrag an:

- **Host / Name:** `_dmarc`
- **Typ:** TXT
- **Wert:**

```
v=DMARC1; p=none; rua=mailto:dmarc@deine-domain.de
```

`p=none` heißt: Empfänger stellen weiter alles zu, schicken dir aber Berichte. So siehst du, ob noch ein Versender fehlt, bevor etwas blockiert wird.

Die Klicks bei deinem Hoster findest du hier: [DMARC bei IONOS](/anleitung/ionos/dmarc), [DMARC bei STRATO](/anleitung/strato/dmarc), [DMARC bei ALL-INKL](/anleitung/all-inkl/dmarc), [Hetzner](/anleitung/hetzner/spf-dkim-dmarc).

**4. Berichte lesen und verschärfen.** Wenn in den Berichten nur noch deine echten Versender auftauchen und alle bestehen, stellst du um auf:

```
v=DMARC1; p=quarantine; rua=mailto:dmarc@deine-domain.de
```

Mails, die durchfallen, landen dann im Spam. Läuft das stabil, folgt der letzte Schritt:

```
v=DMARC1; p=reject; rua=mailto:dmarc@deine-domain.de
```

Warum nicht gleich streng? Bei `quarantine` oder `reject` schickt Microsoft eigene Mails, die DMARC nicht bestehen, über einen Pool für riskante Absender. Das lässt sich laut Microsoft nicht abschalten. Ein vergessener Versender fällt dann doppelt auf. Mit dem Umweg über `none` siehst du solche Lücken vorher in den Berichten.

Microsoft beschreibt zusätzlich einen noch sanfteren Weg mit `pct`. Damit gilt die Regel zuerst nur für einen Teil der Mails, etwa `pct=10`, dann 25, 50, 75 und 100.

## Sonderfall: Newsletter-Tool oder Kontaktformular

Jede Mail mit deiner Absenderadresse muss DMARC bestehen, also auch Newsletter und Formular-Mails. Dafür braucht der Dienst SPF oder DKIM mit deiner Domain. Prüf das in den DMARC-Berichten, bevor du auf quarantine gehst.

Microsoft empfiehlt, Massen-Mails über eine Subdomain wie `news.deine-domain.de` zu schicken. Subdomains erben die DMARC-Regel deiner Hauptdomain, können aber eine eigene bekommen.

Ein praktischer Weg: Die Subdomain bekommt zuerst `p=none`, während deine Hauptdomain schon auf `quarantine` steht. So schützt du deine Geschäftsmails, ohne dass ein falsch eingerichteter Newsletter sofort im Spam landet.

Hast du Domains, die gar keine Mails verschicken, schützt du sie mit einer strengen Regel. Microsoft nennt dafür `v=DMARC1; p=reject;` ohne Berichtsadresse. So kann niemand mit diesen Domains Mails in deinem Namen fälschen.

## Danach testen

Prüf den neuen Eintrag im [DMARC-Check](/dmarc-check). Dann schick eine Mail aus Outlook an den [Mail-Test](/). Der Prüfpunkt **Schutzregel** zeigt, ob DMARC gefunden wird und ob deine Mail besteht. Weitere Anbieter findest du unter [Anleitungen pro Anbieter](/anleitung).

## Typische Fehler und Lösungen

| Problem | Ursache | Lösung |
|---|---|---|
| Kein DMARC gefunden | Host falsch, etwa `_dmarc.deine-domain.de.deine-domain.de` | Bei Hostern, die die Domain anhängen, nur `_dmarc` eintragen |
| „permerror“ | Zwei `_dmarc`-Einträge oder Tippfehler | Nur einen Eintrag behalten, Semikolons prüfen |
| Keine Berichte kommen an | Postfach existiert nicht oder liegt auf fremder Domain | Postfach anlegen; bei fremder Domain braucht diese einen Freigabe-Eintrag |
| Newsletter landet im Spam | Tool besteht DMARC nicht | DKIM für das Tool einrichten, Regel zurück auf `p=none` bis es passt |
