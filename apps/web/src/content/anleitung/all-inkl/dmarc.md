---
titel: "DMARC bei ALL-INKL einrichten: Eintrag im KAS anlegen oder ändern"
seoTitel: "ALL-INKL DMARC einrichten: Eintrag im KAS anlegen"
beschreibung: "So legst du bei ALL-INKL im KAS einen DMARC-Eintrag an oder änderst ihn. Mit Wert zum Kopieren und Tipps zur richtigen Regel."
keyword: "all-inkl dmarc"
anbieter: "all-inkl"
anbieterName: "ALL-INKL"
themen: ["dmarc"]
dauer: "5 Minuten"
kurzantwort: "Bei ALL-INKL legst du DMARC als TXT-Eintrag mit dem Namen _dmarc in den DNS-Einstellungen des KAS an. Als Standard nennt ALL-INKL die Regel v=DMARC1; p=none;, die nur beobachtet. Gibt es den Eintrag schon, bearbeitest du ihn, statt einen zweiten anzulegen."
schritte:
  dmarc:
    - text: "Im KAS unter **Tools** die **DNS-Einstellungen** öffnen und deine Domain bearbeiten."
    - text: "Vorhandenen DMARC-Eintrag **Bearbeiten** oder, falls keiner existiert, **neuen DNS-Eintrag erstellen**."
    - text: "Name **_dmarc**, Typ **TXT**, Prio leer. Bei **Data** diesen Wert eintragen. Die Report-Adresse muss ein Postfach sein, das du liest."
      eintrag:
        typ: "TXT"
        host: "_dmarc"
        wert: "v=DMARC1; p=none; rua=mailto:dmarc@{domain}"
    - text: "Speichern, einige Stunden warten und mit dem DMARC-Check prüfen."
    - text: "Erst wenn alle Versender bestehen, die Regel auf **p=quarantine** und später **p=reject** verschärfen."
faq:
  - frage: "Ist DMARC bei ALL-INKL automatisch aktiv?"
    antwort: "ALL-INKL nennt v=DMARC1; p=none; als Standardwert. Ob der Eintrag bei deiner Domain schon angelegt ist, zeigt dir der DMARC-Check. Mit p=none wird ohnehin nichts blockiert, die Regel beobachtet nur."
  - frage: "Welche DMARC-Regel soll ich bei ALL-INKL wählen?"
    antwort: "Starte mit p=none und einer Report-Adresse. Prüf dann, ob alle Versender SPF oder DKIM bestehen. Erst danach verschärfst du auf quarantine und später auf reject."
  - frage: "Kann ich DMARC-Berichte an eine andere Domain schicken lassen?"
    antwort: "Ja, aber die Ziel-Domain muss zustimmen. Dafür braucht sie einen TXT-Eintrag mit v=DMARC1 unter dem Namen deine-domain.de._report._dmarc. Ohne diesen Eintrag verwerfen Empfänger die Berichte."
  - frage: "Was passiert mit meinem DMARC-Eintrag bei Zone zurücksetzen?"
    antwort: "Zone zurücksetzen stellt die Standard-DNS-Einstellungen her und löscht dabei alle selbst angelegten Einträge. Hast du deine DMARC-Regel angepasst, musst du sie danach neu eintragen."
quelle:
  - titel: "ALL-INKL Anleitung: DMARC"
    url: "https://all-inkl.com/wichtig/anleitungen/kas/tools/dns-werkzeuge/dmarc_562.html"
stand: "2026-10-21"
geprueft: false
offenePunkte:
  - "Unklar, ob ALL-INKL den Standard-DMARC v=DMARC1; p=none; automatisch für jede Domain anlegt oder nur als Empfehlung nennt. Per DMARC-Check einer ALL-INKL-Domain prüfen."
  - "Oberfläche prüfen: Löscht Zone zurücksetzen auch den DMARC-Eintrag, oder gehört ein Standard-DMARC zur Zone?"
  - "Wartezeit: Die ALL-INKL-Anleitung nennt keine."
---

## Vorher prüfen: Gibt es schon eine DMARC-Regel?

Gib deine Domain im [DMARC-Check](/dmarc-check) ein. Er zeigt, ob bereits ein Eintrag existiert und welche Regel gilt. Gibt es einen, bearbeitest du ihn. Zwei DMARC-Einträge machen die Regel ungültig.

DMARC baut auf SPF und DKIM auf. Für den ALL-INKL-Mailserver sind beide laut ALL-INKL schon eingerichtet. Prüf das mit einer Testmail über den [Mail-Test](/): Stehen **Absender bestätigt** und **Mail unterschrieben** auf grün, bist du bereit. Was DMARC macht, erklären wir in [DMARC einfach erklärt](/wissen/dmarc).

## Schritt für Schritt: DMARC-Eintrag im KAS anlegen

1. Melde dich im KAS (technische Verwaltung) unter `kas.all-inkl.com` an.
2. Öffne **Tools** und dann **DNS-Einstellungen**. Bearbeite deine Domain.
3. Gibt es schon einen DMARC-Eintrag, klick bei ihm auf **Bearbeiten**. Sonst wähle **neuen DNS-Eintrag erstellen**.
4. Füll die Felder so aus:

| Feld | Inhalt |
|---|---|
| Name | `_dmarc` |
| Typ | TXT |
| Prio | leer lassen |
| Data | deine DMARC-Regel |

5. Speichere den Eintrag.

Für den Start empfehlen wir diesen Wert. Er entspricht dem ALL-INKL-Standard, ergänzt um eine Adresse für Berichte:

```
v=DMARC1; p=none; rua=mailto:dmarc@deine-domain.de
```

| Teil | Bedeutung |
|---|---|
| `v=DMARC1` | Kennzeichnet den Eintrag. Muss vorne stehen. |
| `p=none` | Noch nichts unternehmen, nur beobachten. |
| `rua=mailto:…` | Hierhin schicken Mailanbieter Sammelberichte. |

Die Adresse hinter `mailto:` muss existieren. Ein eigenes Postfach ist sinnvoll, weil die Berichte als Anhänge kommen und zahlreich werden können. ALL-INKL zeigt in seiner Anleitung auch ein strenges Beispiel mit `p=reject` und `adkim=s`. Damit solltest du nicht starten.

### Berichte an eine andere Domain

Sollen die Berichte an eine Adresse bei einer anderen Domain gehen, etwa an deine Agentur, muss diese Domain zustimmen. Dafür legt der Inhaber der Ziel-Domain dort einen TXT-Eintrag mit dem Wert `v=DMARC1` an, unter diesem Namen:

```
deine-domain.de._report._dmarc
```

## Sonderfall: Ein weiterer Dienst verschickt Mails für dich

DMARC prüft jede Mail, die mit deiner Domain als Absender ankommt. Verschickt neben ALL-INKL auch ein Newsletter-Tool, Microsoft 365 oder ein Kontaktformular auf einem anderen Server in deinem Namen, muss jeder dieser Dienste SPF oder DKIM passend zu deiner Domain bestehen.

Mit `p=none` passiert noch nichts, die Berichte zeigen dir aber, wer durchfällt. Bei `p=quarantine` landen diese Mails im Spam, bei `p=reject` kommen sie nicht an. ALL-INKL weist selbst darauf hin: Bei externen Mailservern musst du den Standard-SPF anpassen und den DKIM-Schlüssel des externen Servers hinterlegen.

So gehst du vor:

1. Liste alle Dienste auf, die mit deiner Adresse verschicken.
2. Ergänze jeden im SPF-Eintrag: [SPF-Eintrag bei ALL-INKL setzen](/anleitung/all-inkl/spf).
3. Leg für jeden Dienst den DKIM-Eintrag an: [DKIM bei ALL-INKL einrichten](/anleitung/all-inkl/dkim).
4. Schick aus jedem Dienst eine Testmail an den [Mail-Test](/). Erst wenn **Schutzregel** überall grün ist, verschärfst du die Regel.

Zum Verschärfen änderst du nur den Teil `p=` im bestehenden Eintrag:

```
v=DMARC1; p=quarantine; rua=mailto:dmarc@deine-domain.de
```

## Danach testen

Warte nach dem Speichern ein paar Stunden. Prüf dann mit dem [DMARC-Check](/dmarc-check), ob die neue Regel erscheint. Eine Testmail über den [Mail-Test](/) zeigt dir unter **Schutzregel**, ob deine Mails sie bestehen. Lass `p=none` ein paar Wochen laufen und lies die Berichte, bevor du verschärfst. Tauchen dort unbekannte Server auf, hast du entweder einen Dienst vergessen oder jemand fälscht Mails in deinem Namen. Alle Anbieter findest du in der [Übersicht der Anleitungen](/anleitung).

## Typische Fehler und Lösungen

| Meldung | Bedeutung | Lösung |
|---|---|---|
| Kein DMARC-Eintrag gefunden | Name falsch, z. B. mit Domain dahinter. | Bei Name nur `_dmarc` eintragen. |
| Mehrere DMARC-Einträge | Ein zweiter Eintrag wurde neu angelegt statt bearbeitet. | Einen löschen. |
| Ungültige Syntax | `v=DMARC1` nicht vorne oder Leerzeichen um `=`. | Wert aus dieser Anleitung kopieren. |
| Keine Berichte an fremde Domain | Die Ziel-Domain hat nicht zugestimmt. | Dort den `._report._dmarc`-Eintrag anlegen. |
