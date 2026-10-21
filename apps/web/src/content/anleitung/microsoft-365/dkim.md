---
titel: "DKIM in Microsoft 365 einrichten: so aktivierst du die Unterschrift"
seoTitel: "Microsoft 365 DKIM einrichten: Schritt für Schritt"
beschreibung: "So aktivierst du DKIM für deine eigene Domain in Microsoft 365: Defender-Portal, zwei CNAME-Einträge, Schalter an. Einfach erklärt."
keyword: "microsoft 365 dkim"
anbieter: "microsoft-365"
anbieterName: "Microsoft 365"
themen: ["dkim"]
dauer: "15 Minuten plus Wartezeit"
kurzantwort: "Bei Microsoft 365 ist DKIM für deine eigene Domain nicht automatisch aktiv. Ohne Einrichtung unterschreibt Microsoft deine Mails nur mit der Adresse auf onmicrosoft.com, und DMARC schlägt für deine Domain fehl. Du legst zwei CNAME-Einträge bei deinem Domain-Anbieter an und schaltest danach im Defender-Portal die Signatur ein."
schritte:
  dkim:
    - text: "Im Defender-Portal **security.microsoft.com** öffnen: **E-Mail & Zusammenarbeit** > **Richtlinien & Regeln** > **Bedrohungsrichtlinien**."
    - text: "**E-Mail-Authentifizierungseinstellungen** > Reiter **DKIM**, Zeile der Domain anklicken, beide Werte unter **CNAMEs veröffentlichen** kopieren."
    - text: "Bei deinem Domain-Anbieter zwei CNAME-Einträge anlegen: Host **selector1._domainkey** und **selector2._domainkey**, Wert jeweils aus dem Portal kopieren."
    - text: "Einige Minuten warten, bis Microsoft die Einträge erkennt."
    - text: "Im Portal den Schalter **Nachrichten für diese Domäne mit DKIM-Signaturen signieren** aktivieren."
    - text: "Mit einer Testmail prüfen, ob die Mail jetzt mit deiner Domain unterschrieben ist."
faq:
  - frage: "Ist DKIM bei Microsoft 365 automatisch aktiv?"
    antwort: "Nur für die Adresse auf onmicrosoft.com. Für deine eigene Domain musst du DKIM selbst einschalten. Bis dahin tragen deine Mails nur eine Unterschrift von onmicrosoft.com, die nicht zu deiner Absenderadresse passt."
  - frage: "Wo finde ich die CNAME-Werte für DKIM?"
    antwort: "Im Defender-Portal unter E-Mail-Authentifizierungseinstellungen, Reiter DKIM. Klick auf deine Domain, die Werte stehen im Abschnitt CNAMEs veröffentlichen. Sie sind für jede Firma anders, deshalb kannst du sie nicht aus einem Beispiel abschreiben."
  - frage: "Warum kommt beim Einschalten eine Fehlermeldung?"
    antwort: "Das ist normal, wenn die CNAME-Einträge noch fehlen. Microsoft zeigt dann ein Fenster mit einem Clientfehler, danach steht der Status auf CnameMissing. Leg die Einträge an, warte etwas und schalte DKIM danach erneut ein."
  - frage: "Wie lange dauert es, bis DKIM wirkt?"
    antwort: "Laut Microsoft dauert es einige Minuten oder auch länger, bis die neuen CNAME-Einträge erkannt werden. Erst dann lässt sich der Schalter aktivieren. Danach unterschreibt Microsoft 365 neue Mails mit deiner Domain."
quelle:
  - titel: "Microsoft Learn: DKIM für E-Mail in Ihrer benutzerdefinierten Domäne verwenden"
    url: "https://learn.microsoft.com/de-de/defender-office-365/email-authentication-dkim-configure"
  - titel: "Microsoft Learn (Englisch, Originalfassung): How to use DKIM for email in your custom domain"
    url: "https://learn.microsoft.com/en-us/defender-office-365/email-authentication-dkim-configure"
  - titel: "Host Europe FAQ: Wie kann ich DKIM für Microsoft 365 einrichten?"
    url: "https://www.hosteurope.de/faq/microsoft365/allgemeines_m365/m365-dkim-einrichtung"
stand: "2026-10-21"
geprueft: false
offenePunkte:
  - "Seitenname „E-Mail-Authentifizierungseinstellungen“ und Schalter „Nachrichten für diese Domäne mit DKIM-Signaturen signieren“ sind durch Microsoft Learn (de) und Host Europe belegt, aber nicht per eigenem Screenshot. Beim ersten echten Durchlauf gegenprüfen."
  - "Links auf Hoster-Anleitungen (/anleitung/ionos/dkim usw.) setzen voraus, dass diese Seiten zum Launch online sind."
---

## Vorher prüfen

Schick aus Outlook eine Mail an deine Adresse im [Mail-Test](/). Der Prüfpunkt **Mail unterschrieben** zeigt dir, ob die Unterschrift zu deiner Domain gehört oder nur zu onmicrosoft.com. Genau das ist bei Microsoft 365 der häufigste Fehler.

Ohne Testmail geht es mit dem [DKIM-Check](/dkim-check). Er sucht automatisch nach `selector1` und `selector2`, den Namen, die Microsoft 365 verwendet. Wie die digitale Unterschrift funktioniert, erklärt [Was ist DKIM?](/wissen/dkim).

## Schritt für Schritt

Voraussetzung: Deine Domain ist bereits in Microsoft 365 hinzugefügt und bestätigt. Du brauchst Admin-Rechte.

**1. Defender-Portal öffnen.** Geh auf `security.microsoft.com` und klick nacheinander auf **E-Mail & Zusammenarbeit** > **Richtlinien & Regeln** > **Bedrohungsrichtlinien** > **E-Mail-Authentifizierungseinstellungen**. Wähl dort den Reiter **DKIM**. Direkt dorthin kommst du über `security.microsoft.com/authentication?viewid=DKIM`.

**2. Werte holen.** In der Liste steht deine Domain mit einem Schalter auf **Deaktiviert** und dem Status **NoDKIMKeys**. Versuchst du den Schalter einzuschalten, erscheint ein Fenster mit einem Clientfehler. Keine Sorge: Das ist der normale Weg. Bestätige mit **OK**. Der Status heißt jetzt **CnameMissing**.

Alternativ öffnest du die Domain direkt. Steht dort „Keine DKIM-Schlüssel für diese Domäne gespeichert“, klickst du unten auf **DKIM-Schlüssel erstellen**.

Klick auf die Zeile deiner Domain (nicht auf den Schalter). Im Seitenfenster findest du unter **CNAMEs veröffentlichen** zwei Werte. Kopier beide.

**3. Zwei CNAME-Einträge anlegen.** Öffne in einem zweiten Tab die DNS-Einstellungen bei dem Anbieter, bei dem deine Domain liegt. Leg zwei Einträge vom Typ CNAME an:

| Host / Name | Typ | Ziel / Wert |
|---|---|---|
| `selector1._domainkey` | CNAME | Wert 1 aus dem Portal |
| `selector2._domainkey` | CNAME | Wert 2 aus dem Portal |

Die Zielwerte sind für jede Firma verschieden. Sie beginnen mit `selector1-` bzw. `selector2-` und enden bei neuen Einrichtungen auf `dkim.mail.microsoft`. Ältere Einrichtungen zeigen noch auf eine Adresse mit `onmicrosoft.com`, auch das ist in Ordnung. Schreib die Werte nicht aus einem Beispiel ab, sondern kopier sie aus dem Portal. Der Teil mit deinem Domainnamen weicht oft von der Schreibweise ab, die du erwarten würdest.

Für die Klicks bei deinem Hoster hilft dir die passende Anleitung: [DKIM bei IONOS](/anleitung/ionos/dkim), [DKIM bei STRATO](/anleitung/strato/dkim), [DKIM bei ALL-INKL](/anleitung/all-inkl/dkim) oder [Hetzner](/anleitung/hetzner/spf-dkim-dmarc).

**4. Warten.** Laut Microsoft dauert es einige Minuten oder länger, bis die Einträge erkannt werden.

**5. Signatur einschalten.** Zurück im Seitenfenster deiner Domain aktivierst du den Schalter **Nachrichten für diese Domäne mit DKIM-Signaturen signieren**. Es erscheint ein Hinweis, dass die Änderung einige Minuten dauern kann, den du mit **OK** schließt. Klappt es, steht als Status **Signieren von DKIM-Signaturen für diese Domäne**.

## Sonderfall: Domain beim Hoster, weitere Versender

Liegt deine Domain zum Beispiel bei IONOS, hat IONOS dort eventuell eigene DKIM-Einträge für seinen Mailserver angelegt (`s1-ionos._domainkey`). Die stören nicht: Jeder Versender hat seinen eigenen Selektor. Du ergänzt nur die zwei Microsoft-Einträge.

Verschickst du zusätzlich über ein Newsletter-Tool oder dein Kontaktformular, braucht jeder dieser Dienste seine eigene DKIM-Einrichtung. Die Werte bekommst du vom jeweiligen Dienst, nicht von Microsoft.

Nutzt du mehrere eigene Domains in Microsoft 365, wiederholst du die Schritte für jede Domain. Jede bekommt ihre eigenen zwei CNAME-Einträge mit eigenen Zielwerten. Gleiches gilt für Subdomains, von denen du verschickst.

Warum zwei Einträge? Microsoft erzeugt zwei Schlüsselpaare. Einer ist aktiv, der andere wartet auf den nächsten Schlüsselwechsel. Durch die CNAME-Einträge kann Microsoft die Schlüssel später tauschen, ohne dass du im DNS noch einmal etwas ändern musst.

## Danach testen

Schick eine neue Mail über den [Mail-Test](/). Steht **Mail unterschrieben** auf Grün und nennt deine Domain, ist alles richtig. Alternativ prüfst du im [DKIM-Check](/dkim-check), ob `selector1` gefunden wird.

DKIM ist die Grundlage für die Schutzregel. Mach danach weiter mit [DMARC für Microsoft 365](/anleitung/microsoft-365/dmarc) und kontrolliere den [SPF-Eintrag für Microsoft 365](/anleitung/microsoft-365/spf). Alle Anbieter findest du unter [Anleitungen pro Anbieter](/anleitung).

## Typische Fehler und Lösungen

| Meldung oder Symptom | Ursache | Lösung |
|---|---|---|
| Fehlerfenster beim Einschalten | CNAME-Einträge fehlen noch | Einträge anlegen, warten, erneut einschalten |
| Status bleibt **CnameMissing** | Tippfehler oder falscher Host | Host prüfen: manche Hoster hängen die Domain automatisch an, dann steht sie doppelt im Namen |
| Test zeigt Unterschrift von onmicrosoft.com | Schalter ist noch aus | Schritt 5 wiederholen |
| Domain fehlt im Reiter DKIM | Domain nicht in Microsoft 365 bestätigt | Erst die Domain im Admin Center hinzufügen |

Der Fehler mit der doppelten Domain ist häufig: Trägst du `selector1._domainkey.deine-domain.de` ein und der Hoster hängt die Domain selbst an, entsteht `selector1._domainkey.deine-domain.de.deine-domain.de`. Dann reicht `selector1._domainkey`.
