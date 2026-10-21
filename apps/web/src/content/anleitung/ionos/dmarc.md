---
titel: "DMARC bei IONOS einrichten: Eintrag Schritt für Schritt"
seoTitel: "IONOS DMARC einrichten: Eintrag Schritt für Schritt"
beschreibung: "So legst du bei IONOS einen DMARC-Eintrag an: Menüpfad, Wert zum Kopieren und welche Regel für den Start die richtige ist."
keyword: "ionos dmarc"
anbieter: "ionos"
anbieterName: "IONOS"
themen: ["dmarc"]
dauer: "5 Minuten"
kurzantwort: "Bei IONOS ist DMARC nicht automatisch eingerichtet. Du legst den Eintrag selbst an: einen TXT-Record mit dem Hostnamen _dmarc in den DNS-Einstellungen deiner Domain. Starte mit der Regel p=none, damit keine echte Mail verloren geht."
schritte:
  dmarc:
    - text: "Im IONOS Konto bei deiner Domain unter **Aktionen** die drei Punkte anklicken und **DNS** wählen."
    - text: "**Record hinzufügen** klicken und beim Feld **Typ** **TXT** auswählen."
    - text: "Bei **Hostname** **_dmarc** und bei **Wert** diesen Eintrag eintragen. Die Adresse nach mailto: muss ein Postfach sein, das du liest."
      eintrag:
        typ: "TXT"
        host: "_dmarc"
        wert: "v=DMARC1; p=none; rua=mailto:dmarc@{domain}"
    - text: "Auf **Speichern** klicken. Nach bis zu einer Stunde ist der Eintrag überall sichtbar."
    - text: "Nach einigen Wochen ohne Probleme die Regel auf **p=quarantine** und später **p=reject** verschärfen."
faq:
  - frage: "Ist DMARC bei IONOS automatisch aktiv?"
    antwort: "Die IONOS-Hilfe beschreibt DMARC nur als Eintrag, den du selbst anlegst. Prüf mit dem DMARC-Check, ob für deine Domain schon eine Regel existiert. Wenn nicht, legst du sie wie in dieser Anleitung an."
  - frage: "Welche DMARC-Regel soll ich bei IONOS wählen?"
    antwort: "Starte mit p=none und einer Report-Adresse. So siehst du erst, ob alle deine Versender sauber durchkommen. Erst wenn das passt, wechselst du zu quarantine und später zu reject."
  - frage: "Wie lange dauert es, bis der DMARC-Eintrag bei IONOS wirkt?"
    antwort: "Laut IONOS ist die Änderung sofort im eigenen System aktiv. Bis sie weltweit überall greift, kann es bis zu einer Stunde dauern."
  - frage: "Was passiert mit meinen Mails bei p=reject, wenn SPF oder DKIM fehlen?"
    antwort: "Empfänger lehnen Mails ab, die weder SPF noch DKIM passend zu deiner Domain bestehen. Fehlt ein Newsletter-Tool im SPF oder ohne DKIM, kommen dessen Mails dann nicht mehr an. Deshalb immer erst mit p=none starten."
quelle:
  - titel: "IONOS Hilfe: DMARC-Record für eine Domain konfigurieren"
    url: "https://www.ionos.de/hilfe/domains/mailserver-und-verwandte-records-konfigurieren/dmarc-record-fuer-eine-domain-konfigurieren/"
stand: "2026-10-21"
geprueft: false
offenePunkte:
  - "Prüfen, ob IONOS für neue Domains inzwischen automatisch einen DMARC-Eintrag anlegt. Die Hilfeseite sagt dazu nichts."
  - "Oberfläche prüfen: Bietet IONOS beim Record-Typ eine eigene DMARC-Vorlage, oder nur das allgemeine TXT?"
---

## Vorher prüfen: Gibt es schon eine DMARC-Regel?

Gib deine Domain im [DMARC-Check](/dmarc-check) ein. Er zeigt dir, ob es bereits einen Eintrag gibt und welche Regel darin steht. Existiert schon einer, änderst du ihn, statt einen zweiten anzulegen. Zwei DMARC-Einträge machen die Regel ungültig.

DMARC baut auf SPF und DKIM auf. Bevor du die Regel anlegst, sollten beide passen. Schick dazu über den [Mail-Test](/) eine Testmail aus deinem IONOS-Postfach. Stehen **Absender bestätigt** und **Mail unterschrieben** auf grün, bist du bereit. Was hinter DMARC steckt, erklären wir in [DMARC einfach erklärt](/wissen/dmarc).

## Schritt für Schritt: DMARC-Eintrag bei IONOS anlegen

1. Melde dich im IONOS Konto an. Klick bei deiner Domain unter **Aktionen** auf die drei Punkte und wähle **DNS**.
2. Klick auf **Record hinzufügen**. Wähle beim Feld **Typ** den Eintrag **TXT**.
3. Trag im Feld **Hostname** `_dmarc` ein. IONOS macht daraus automatisch `_dmarc.deine-domain.de`.
4. Trag im Feld **Wert** deine Regel ein (siehe unten).
5. Die **TTL** kannst du optional anpassen. Für den Start reicht die Voreinstellung.
6. Klick auf **Speichern**.

Für den Start empfehlen wir diesen Wert:

```
v=DMARC1; p=none; rua=mailto:dmarc@deine-domain.de
```

Was die Teile bedeuten:

| Teil | Bedeutung |
|---|---|
| `v=DMARC1` | Kennzeichnet den Eintrag als DMARC. Steht immer vorne. |
| `p=none` | Regel: noch nichts unternehmen, nur beobachten. |
| `rua=mailto:…` | An diese Adresse schicken große Mailanbieter Sammelberichte. |

Die Adresse hinter `mailto:` muss es wirklich geben. Leg dafür am besten ein eigenes Postfach oder eine Weiterleitung an, denn die Berichte kommen als Dateianhänge und können zahlreich werden.

Die IONOS-Hilfe zeigt als Beispiel direkt `p=reject`. Davon raten wir zum Start ab. Google und Microsoft empfehlen, mit `p=none` zu beginnen und erst nach Prüfung der Berichte zu verschärfen.

## Sonderfall: Ein weiterer Dienst verschickt Mails für dich

DMARC prüft jede Mail, die mit deiner Domain als Absender ankommt, egal von welchem Server. Verschickt ein Newsletter-Tool, Microsoft 365 oder dein Kontaktformular ebenfalls in deinem Namen, muss auch dieser Dienst SPF oder DKIM passend zu deiner Domain bestehen. Sonst greift deine Regel bei genau diesen Mails.

Bei `p=none` passiert dann noch nichts, die Berichte zeigen dir aber, welcher Dienst durchfällt. Bei `p=quarantine` landen seine Mails im Spam, bei `p=reject` kommen sie gar nicht an.

So gehst du sicher vor:

1. Liste alle Dienste auf, die mit deiner Adresse verschicken.
2. Ergänze jeden im SPF-Eintrag: [SPF-Eintrag bei IONOS setzen](/anleitung/ionos/spf).
3. Richte für jeden Dienst DKIM mit deiner Domain ein: [DKIM bei IONOS einrichten](/anleitung/ionos/dkim).
4. Schick aus jedem Dienst eine Testmail an den [Mail-Test](/). Erst wenn **Schutzregel** überall grün ist, verschärfst du die Regel.

Für die Verschärfung änderst du nur den Wert `p=` im bestehenden Eintrag, zum Beispiel:

```
v=DMARC1; p=quarantine; rua=mailto:dmarc@deine-domain.de
```

## Danach testen

Laut IONOS ist die Änderung sofort aktiv und nach spätestens einer Stunde überall sichtbar. Prüf dann mit dem [DMARC-Check](/dmarc-check), ob der Eintrag richtig erkannt wird. Eine Testmail über den [Mail-Test](/) zeigt dir unter **Schutzregel**, ob deine Mails die Regel bestehen. Lass die Regel danach ein paar Wochen auf `p=none` laufen und schau in die Berichte, bevor du verschärfst. Tauchen dort Server auf, die du nicht kennst, ist das ein Hinweis auf einen vergessenen Dienst oder auf Fälschungen in deinem Namen. Alle Anbieter findest du in der [Übersicht der Anleitungen](/anleitung).

## Typische Fehler und Lösungen

| Meldung | Bedeutung | Lösung |
|---|---|---|
| Kein DMARC-Eintrag gefunden | Hostname falsch, z. B. `_dmarc.deine-domain.de` doppelt eingetragen. | Im Feld Hostname nur `_dmarc` eintragen. |
| Mehrere DMARC-Einträge | Zwei TXT-Einträge unter `_dmarc`. | Einen löschen, nur einen behalten. |
| Ungültige Syntax | `v=DMARC1` steht nicht vorne oder Semikolons fehlen. | Wert aus dieser Anleitung kopieren. |
| DMARC fail | SPF und DKIM passen nicht zur Absender-Domain. | Fehlenden Dienst in SPF und DKIM ergänzen. |
