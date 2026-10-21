# Redesign-Auftrag: cleaner SaaS-Stil (final, 21.10.2026)

Projektordner: /Users/dennisbuchwald/Arbeitsplatz/01_Code/e-mail-check.de

Die Seite ist funktional fertig. Jetzt kommt ein **visuelles und inhaltliches Redesign**: weg von dicken schwarzen Outlines, hin zu einer modernen, ruhigen SaaS-Oberfläche mit leichtem Labor-Charakter. Leitsatz: **Mit wenig Design viel sagen.** Harmonisch, ausgeglichen, sofort benutzbar. UX-Vorbild: Trade Republic (Komplexes extrem einfach, große Zahlen, feine Listen, viel Weißraum).

## 1. Verbindliche Entwürfe (`design/redesign/`)
| Datei | Was |
|---|---|
| `start-final-hero-aura-hell.dc.html` | **Startseite Hero** (Option A + helle Aura) |
| `start-final-sektionen.dc.html` | **Sektionen unter dem Hero**: „Was wir prüfen“ + „Was bedeutet die Zahl?“ |
| `ergebnis-final.dc.html` | **Ergebnisansicht** mit Mail-Kopf, Teil-Scores, Aktionsplan |
| `start-option-*.dc.html`, `ergebnis-neu.dc.html`, `verworfen-*` | nur Ideen-Fundus, nicht umsetzen |

Klickbarer Canvas zum Ansehen (Reihen „Redesign“): https://claude.ai/artifact/MS321wZJK4B77Q1jJnYmJW
Die `.dc.html`-Dateien sind Design-Vorlagen (Markup, Inline-Styles, CSS-Animationen 1:1 übernehmbar), nicht direkt lauffähig.
Logo, Status-Farben und Schriften bleiben (`brand/`, `CLAUDE.md`). Du darfst selbst recherchieren (Websuche, Claude in Chrome), wenn dir etwas Besseres einfällt. Begründe Abweichungen kurz.

## 2. Neues Design-System (ersetzt „Formen“ in CLAUDE.md Abschnitt 9)
- **Keine dicken Outlines mehr.** Karten weiß, `1px solid #E7E7EB`, Radius 20 px, Schatten `0 1px 2px rgba(17,17,19,.04), 0 12px 32px rgba(17,17,19,.05)`.
- **Flächen:** Seite `#FFFFFF` bzw. `#FAFAFB` (Ergebnis, Sektionen), innere Felder `#F6F6F7`, Linien `#EEEEF1`.
- **Tinte** `#111113`, gedeckt `#5B5C61` / `#6B6C70`.
- **Buttons:** Radius 14 px, Höhe 52 px, primär Tinte, sekundär weiß mit 1-px-Rand.
- **Typo:** Überschriften und große Zahlen Fraunces 680, Fließtext Inter, **Labels/Eyebrows in IBM Plex Mono** (12 px, Versalien, Laufweite 0.12em) für den Labor-Charakter.
- **Statusfarben** `#02CA50` / `#FF8A00` / `#FF4034` zurückhaltend: Punkte, dünne Balken, Chips mit hellen Tönungen (`#E3F8EC`, `#FFF1E0`, `#FFE9E7`) und Tinte als Text.
- **Navigation:** kein Kasten. Schlichte Leiste 72 px, Logo links, Links rechts, auf der Startseite transparent über der Aura.
- `CLAUDE.md` Abschnitt 9 entsprechend aktualisieren.

## 3. Startseite
**Hero (füllt genau den Bildschirm: `min-height: 100svh`, Desktop und Mobil)**
- Eyebrow mit pulsierendem grünem Live-Punkt, Headline „Kommt deine Mail an?“, ein Satz.
- **Instrument-Panel** (leicht milchglasig, `backdrop-filter: blur`): Testadresse groß in Mono + Kopieren, Statuszeile „Bereit. Wir warten auf deine Mail.“, Button „Mail ist raus“. Darunter eine Zeile Vertrauen: Server in Deutschland · Testmail sofort gelöscht · Keine Cookies, kein Konto.
- **Aura:** 2–3 große, stark weichgezeichnete Farbflächen (Grün `#02CA50` ca. 30 % Deckkraft, Silbergrau, Weiß) hinter dem Panel, die sich langsam bewegen (12–18 s, `alternate`). Dezent, nie bunt. Nur `transform`/`opacity` animieren (Performance), bei `prefers-reduced-motion` stillstehend.
- Unten am Bildschirmrand dezent „So funktioniert's“ mit leicht wippendem Pfeil.

**Darunter (normaler, crawlbarer HTML-Text, nichts per JS verstecken)**
1. **„Was wir prüfen“:** zwei Karten mit Mini-Vorschau, wie das Ergebnis aussieht: Authentifizierungs-Tabelle (SPF, DKIM, DMARC, rDNS, TLS mit Status-Chips) und Sperrlisten-Raster („12/12 sauber“). Die Listen-Namen müssen den tatsächlich abgefragten entsprechen.
2. **„Was bedeutet die Zahl?“:** Skala 0–10 in vier Bereichen (0–4,9 Hohes Risiko · 5–6,9 Gefährdet · 7–8,9 Solide · 9–10 Sehr gut) plus **Ausnahme**: Schlägt SPF, DKIM oder DMARC fehl, warnen wir immer, unabhängig von der Zahl. Logik auch im Scoring umsetzen und in `docs/scoring.md` dokumentieren.
3. Danach die bestehenden SEO-Inhalte (So funktioniert's, FAQ, Ratgeber-Teaser) im neuen, luftigen Stil.

## 4. Prüf-Modus
Inhalt wie in CLAUDE.md (Checkliste offen/läuft/erledigt, Live-Zeilen in Mono, Funken, Haptik), aber im neuen Stil: feine Linien, kein schwerer Rahmen. Die Aura darf im Prüf-Modus etwas intensiver werden und „atmen“, solange geprüft wird.

## 5. Ergebnisansicht (`ergebnis-final.dc.html`)
- **Mail-Kopf** oben: Absender, Betreff, Empfangszeit (aus der echten Mail), rechts „‹ Neuer Test“.
- **Urteil als Headline** in Klartext, abhängig vom Ergebnis (z. B. „Fast geschafft. Eine Sache hält dich von der 10 ab.“ / „Alles im grünen Bereich.“ / „Hier landet viel im Spam. So behebst du es.“).
- **Score-Karte:** große Zahl „6,5 / 10“, Bereichs-Chip („Gefährdet“), daneben **Teil-Scores** als feine Balken: Authentifizierung, Server-Ruf, Inhalt (in %).
- **Aktionsplan „Der Reihe nach beheben. Größte Wirkung zuerst.“:** jedes Problem/Hinweis als Karte mit Nummer (01, 02), Wirkung („Hohe/Geringe Wirkung“), **„+X Pkt. bei Behebung“** (aus dem Scoring berechnet), Klartext, aufklappbar mit DNS-Wert in Mono-Box + Kopieren und Link zur Anbieter-Anleitung.
- Bestandene Prüfungen kompakt in einer Liste darunter („3 Prüfungen bestanden“).
- Rechts: „Was das für dich bedeutet“, „Für deinen Kunden“ (Ergebnis-Link, 7 Tage, noindex), Button „Nach dem Beheben erneut testen“, aufklappbar „Technische Details“ (Header, DNS, Rohdaten), dezent „Lass es einrichten“.
- Befriedigung bleibt: Score zählt hoch, Teil-Balken füllen sich, Karten federn nacheinander ein, Haptik auf Mobil.
- Keine leeren „nicht geprüft“-Einträge anzeigen.

## 6. Von der Konkurrenz gelernt (nur Ideen, kein Kopieren von Design oder Texten)
- **unspam.email:** Punkte pro Behebung, Teil-Scores, Mail-Kopf, Urteil als Headline, Score-Skala mit Ausnahme-Regel, Feature-Karten mit Mini-UI → alles oben eingeplant. **Vermeiden:** Cookie-Banner, überlange Berichte, viele leere Prüfpunkte, generischer Look.
- **h5m.de/domain-check:** Zähler ok/Hinweise/Probleme, „Was das bedeutet“-Karten, Rohdaten in Mono-Boxen → eingeplant.
- **Ideen für später** (nicht bauen, nur in `docs/STATUS.md` mit SEO-Potenzial aus Seobility und Aufwand bewerten): DKIM-Check mit Selektor, DMARC-Generator, Header-Analyzer, Sperrlisten-Check als eigene Seite, BIMI-Check, wiederkehrender Test/Monitoring.

## 7. Ablauf
1. Kurz Umbauplan zeigen (Komponenten, die sich ändern), dann ohne weitere Rückfrage umsetzen.
2. Reihenfolge: Design-Tokens → Navigation/Footer → Hero mit Aura → Sektionen → Prüf-Modus → Ergebnis → Anleitungs-/Ratgeber-Seiten.
3. Scoring-Erweiterungen (Teil-Scores, Punkte pro Behebung, Ausnahme-Regel) mit Tests absichern.
4. Desktop und Mobil per Playwright-Screenshots prüfen, Lighthouse mobil ≥ 95 halten, Barrierefreiheit (Kontrast Text ≥ 4,5:1, Tastatur, `prefers-reduced-motion`).
5. Vorher/Nachher-Screenshots in `docs/redesign/`, `CLAUDE.md` und `docs/STATUS.md` aktualisieren, mir kurz zusammenfassen.
