# Ergebnis V2: Zustellweg + Messwerte + neue Inhalts-Checks (21.10.2026)

Projektordner: `/Users/dennisbuchwald/Arbeitsplatz/01_Code/e-mail-check.de`

Die Ergebnisansicht aus Redesign V1 wirkt zu generisch. Sie wird ersetzt durch **Option D**: Der Zustellweg erzählt das Ergebnis, jede Station zeigt eine eigene Messgrafik. Dazu kommen neue Prüfungen, damit wir inhaltlich mindestens auf dem Niveau von mail-tester.com sind.

Arbeite **autonom**: Plan kurz zeigen, dann ohne Rückfrage umsetzen. Läuft `REDESIGN-V2-PROMPT.md` noch, erst den fertig machen, dann diesen Auftrag.

## 0. Vorlage
- `design/redesign/ergebnis-v2-prototyp.html` im Browser öffnen. Tab **„D · Kombi A + C“** ist verbindlich: Optik, Texte, Animationen.
  - Die Tabs A, B und C sind nur Kontext.
  - Aus C werden die einzelnen Messgrafiken wiederverwendet.
- Ersetzt den Abschnitt „Ergebnisansicht“ aus V1 und `design/redesign/ergebnis-final.dc.html`. Die Datei als `verworfen-ergebnis-v1.dc.html` umbenennen.
- Animationen ohne Bibliothek, wie in `REDESIGN-V2-PROMPT.md` festgelegt.

## 1. Aufbau der Ergebnisseite
1. **Mail-Kopf** wie bisher: Absender, Betreff, Empfangszeit, „‹ Neuer Test“.
2. **Urteil plus Score:**
   - Links die H1 in Klartext, zweizeilig: Zeile 1 in Ink, Zeile 2 grau (`#B4B5BA`).
   - Rechts der Score (Fraunces 96 px, Count-up 1,2 s).
   - Darunter Chips: Bereich („Sehr gut“ …) sowie „X Hinweise“ und „X Probleme“, wenn größer als 0.
   - Die Urteile hängen am Ergebnis. Beispiele:
     - „Deine Mail kam sauber an. Jede Station grün.“
     - „Deine Mail kam sauber an. Ein Tipp für die letzte Stufe.“
     - „Deine Mail kommt an, aber nicht überall. 2 Dinge solltest du beheben.“
     - „Hier landet viel im Spam. So behebst du es.“
3. **Zustellweg-Card mit 6 Stationen:**

   | Nr. | Station | Prüft |
   |---|---|---|
   | 1 | Absender | SPF, Freemail, Absender-Domain |
   | 2 | Unterschrift | DKIM |
   | 3 | Schutzregel | DMARC |
   | 4 | Server-Ruf | Sperrlisten, rDNS, HELO |
   | 5 | Transport | TLS, Zustellkette |
   | 6 | Posteingang | Spamfilter-Regeln, Inhalt |

   - **Jede Station:** Icon im Kreis, Badge oben rechts in der Statusfarbe (grün mit Häkchen, orange mit „!“, rot mit „×“), Titel, kurzer Mono-Messwert.
   - **Linie:** Die Verbindungslinie füllt sich beim Laden von links nach rechts (1,6–1,8 s). Die Badges ploppen nacheinander auf, Abstand 0,25 s, gleiche Bounce-Kurve wie das Logo.
     - Ist eine Station rot, endet die grüne Linie dort. Danach ist sie grau gestrichelt: „Hier bleibt deine Mail hängen.“
   - **Tabs:** Die Stationen sind `role="tab"` und per Tastatur bedienbar (Pfeiltasten).
     - Beim Laden ist die **erste Station mit Problem** geöffnet, sonst die erste mit Hinweis, sonst Station 1.
   - **Detail-Panel** unter den Stationen (hellgrau, über die volle Breite der Card):
     - **Links:** „Station X von 6 · bestanden/Hinweis/Problem“, Titel (Fraunces), Erklärung in Klartext für Laien.
     - **Rechts:** weiße Card mit der **Messgrafik** dieser Station, siehe Abschnitt 2. Darunter die Rohdaten in einer Mono-Box.
     - Bei Hinweis oder Problem zusätzlich eine farbige Tipp-Box: „Was tun“, „+X Pkt. bei Behebung“, bei DNS-Themen der Wert zum Kopieren und ein Link zur Anbieter-Anleitung.
     - Wechselt man die Station, blendet das Panel weich über (opacity/translate, 350 ms).
4. **Darunter drei Cards:**
   - „Was das für dich bedeutet“
   - „Für deinen Kunden“: Ergebnis-Link, 7 Tage gültig, noindex
   - Buttons „Erneut testen“ und „Mail-Quelle & Header“. Der zweite Button öffnet ein Panel mit dem Text- und HTML-Tab der Nachricht sowie den kompletten Rohdaten.
5. **Mobil:** Stationen im 3er-Raster ohne Linie, das Panel einspaltig.
   - Der Mail-Kopf darf umbrechen.
6. **Aktionsplan:** Gibt es mehr als 1 Problem, steht unter der Zustellweg-Card zusätzlich „Der Reihe nach beheben. Größte Wirkung zuerst.“ als kompakte Liste. Ein Klick darauf springt zur jeweiligen Station.
7. Die Seite bleibt `noindex`. Die Inhalte werden serverseitig gerendert, nichts davon nur per JS sichtbar.

## 2. Messgrafiken pro Station (aus Prototyp-Tab C/D)
- **Absender:** Absender-Domain groß. Bei Freemail eine orange Tipp-Box „Eigene Domain nutzen“. Dazu SPF-Ergebnis plus `Received-SPF` roh.
- **Unterschrift:** Schlüssellänge als Balken 1024 / 2048 / 4096, die eigene Länge hervorgehoben. Dazu Selektor, Domain und Ergebnis.
- **Schutzregel:** DMARC als Stufe 1–3 (none, quarantine, reject), die aktuelle Stufe fett. Dazu Alignment (passt die From-Domain?).
- **Server-Ruf:**
  - Anzahl gelisteter Sperrlisten groß, darunter ein Raster aller geprüften Listen mit Punkt.
  - Positivlisten (z. B. DNSWL, Mailspike) als grüne „Guter Ruf“-Zeile.
  - Dazu IP → rDNS, HELO und ob alles zusammenpasst.
- **Transport:**
  - Die Zustellkette aus den `Received`-Headern als Zeitstrahl: Station und Sekunde. Die Laufzeit ergibt sich von der ersten bis zur letzten Station.
  - TLS-Versionen 1.0–1.3: veraltete durchgestrichen, die eigene schwarz hinterlegt.
- **Posteingang:**
  - Spam-Score auf der Skala 0–15 mit Bereichen: grün bis 4, orange bis 6, rot ab 6. Ein Marker fährt beim Öffnen ein.
  - Darunter **jede rspamd-Regel einzeln** mit Klartext-Namen und Punkten: positiv orange, negativ grün.
  - Für die häufigsten rspamd-Symbole (ca. 60) eine deutsche Übersetzungstabelle in `packages/…/rspamd-symbole.de.json` anlegen. Unbekannte Symbole mit Originalnamen zeigen.

## 3. Neue Prüfungen (Backend und Scoring)
1. **Freemail-Absender:**
   - Domain gegen eine Freemail-Liste prüfen (gmail, googlemail, icloud, me, mac, gmx, web.de, t-online, outlook, hotmail, live, yahoo, aol, freenet, posteo, mail.de, proton …). Die Liste liegt als JSON im Repo.
   - Ist der Absender Freemail, ist das ein **Hinweis**, kein Problem. Der Abzug ist klein (Richtwert 0,2). Text: Für Kunden- und Firmenmails eine eigene Domain nutzen.
2. **Mehr Sperrlisten:**
   - Von 4 auf etwa 12 seriöse, frei abfragbare DNSBLs erweitern. Lizenzbedingungen prüfen: Spamhaus nur über den erlaubten Weg, sonst weglassen.
   - Zusätzlich 1–2 Positivlisten (DNSWL, Mailspike WL).
   - Die Liste und die Begründung in `docs/scoring.md` dokumentieren.
   - In der UI stehen nur Listen, die **wirklich** abgefragt wurden.
3. **Links in der Mail:**
   - Domains aus den Links gegen URI-Sperrlisten prüfen (z. B. SURBL, URIBL, über rspamd möglich).
   - **Links niemals aufrufen.** Kein HEAD, kein GET. Sonst würden Abmelde- oder Tracking-Links ausgelöst.
4. **Newsletter-Header:**
   - `List-Unsubscribe` und `List-Unsubscribe-Post` (One-Click, RFC 8058) erkennen.
   - Fehlt beides, ist das nur ein **Hinweis**, wenn die Mail nach Newsletter aussieht: Bulk-Header, Versanddienst erkannt, viele Links oder HTML-Layout. Text: „Für Newsletter verlangen Gmail und Yahoo einen Abmelde-Link im Header.“
5. **Inhalt:**
   - Text-HTML-Verhältnis, nur ein Bild ohne Text, fehlende Text-Version, sehr kurze Mail. Als Hinweise mit kleinem Gewicht, rspamd liefert viel davon schon.
   - Bei Station 6 zeigen.
6. **Vorschau:** Text- und HTML-Version der Nachricht im Panel „Mail-Quelle & Header“ anzeigen.
   - HTML **sandboxed** im `iframe` mit `sandbox=""`, externe Bilder blockiert.
   - Danach wie bisher löschen. Gespeichert werden nur die Prüfergebnisse, nicht der Inhalt, außer für die 7 Tage des Ergebnis-Links, falls das jetzt schon so ist. Bitte prüfen und in `docs/datenschutz-technik.md` festhalten.

**Scoring:**
- Sub-Scores, „+X Pkt. bei Behebung“ und die Ausnahme-Regel bleiben.
- Die neuen Checks einbauen, jeden mit Gewicht in `docs/scoring.md`.
- Eine Mail wie im Beispiel (iCloud, alles grün, Freemail) soll etwa 9,8 ergeben, nicht 10.
- Für jeden neuen Check Unit-Tests schreiben, plus einen End-to-end-Test mit einer echten Beispiel-Mail aus `tests/fixtures/`.

## 4. Ablauf
1. Plan zeigen, dann umsetzen. **Reihenfolge:**
   1. Backend-Checks und Scoring mit Tests
   2. Datenmodell und API für Stationen
   3. UI: Zustellweg, Panel, Grafiken
   4. Panel „Mail-Quelle & Header“
   5. Mobil
   6. Animationen
2. **Testen:**
   - Playwright-Screenshots für 4 Zustände in Desktop und Mobil:
     - alles grün
     - 1 Hinweis (Freemail)
     - SPF fehlt (rot, Linie bricht ab)
     - Spam
   - Lighthouse A11y 100, Tastaturbedienung der Stationen, `prefers-reduced-motion`.
3. Screenshots in `docs/redesign/ergebnis-v2/` ablegen. `CLAUDE.md` aktualisieren (Ergebnis-Abschnitt plus neue Checks), `docs/STATUS.md` pflegen.
4. Committen, **nicht deployen.** Server, DNS und Accounts nicht anfassen, nichts kaufen. Keine erfundenen Zahlen oder Listen.
5. Am Ende kurz melden: was fertig ist, was offen ist, welche Sperrlisten am Ende drin sind und warum.
