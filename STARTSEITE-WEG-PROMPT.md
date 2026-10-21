# Startseite: Sektion „Der Weg deiner Mail“ mit hairline-Figuren (21.10.2026)

Projektordner: `/Users/dennisbuchwald/Arbeitsplatz/01_Code/e-mail-check.de`
Reihenfolge der Aufträge: zuerst `REDESIGN-V2-PROMPT.md`, dann `ERGEBNIS-V2-PROMPT.md`, dann dieser. Arbeite autonom: Plan kurz zeigen, dann umsetzen.

## Idee
Direkt unter dem Hero erklären wir die **6 Stationen**, die auch im Ergebnis vorkommen (Absender, Unterschrift, Schutzregel, Server-Ruf, Transport, Posteingang). Jede Station hat eine feine isometrische Linienfigur, die auf die Maus reagiert. Wer die Startseite kennt, versteht das Ergebnis sofort. Die Sektion **ersetzt** „Was wir prüfen“ aus V1.

Neue Reihenfolge der Startseite:
1. Hero
2. **Der Weg deiner Mail**
3. Was bedeutet die Zahl? (Score-Skala)
4. FAQ
5. Ratgeber-Teaser

Der Hinweis unten im Hero heißt jetzt „Was wir prüfen ⌄“ und springt per Anker hierher.

## Bibliothek
- `@lucasmarkes/hairline` (MIT, keine Abhängigkeiten, ESM): https://hairline.lucasmarkes.com, Quellcode https://github.com/lucasmarkes/hairline
- Installieren mit `pnpm add @lucasmarkes/hairline`. Nicht klonen.
- Die Vanilla-API nutzen: `sieve(el, { play, intensity, theme: 'light', label })`, dazu `update` und `destroy`. React nur, wenn das Frontend ohnehin React-Inseln hat.
- **Nur die verwendeten Figuren importieren.** Die zusätzliche JS-Größe messen und im Bericht nennen, Ziel < 25 kB gzip. Nur auf der Startseite und auf Ratgeber-Seiten laden, per dynamischem `import()`, wenn die Sektion in Sicht kommt.
- Farben über `--hairline-*`-Custom-Properties an unsere Tokens anpassen: Linien `#111113` beziehungsweise `#8A8B91`, Akzent höchstens `#02CA50`.
- Das ist eine Figuren-Bibliothek, keine Animations-Bibliothek. Die Regel „keine Animations-Bibliothek“ bleibt bestehen.

## Sektion
- Eyebrow `DER WEG DEINER MAIL`.
- H2 „Sechs Stationen bis ins Postfach. Wir prüfen jede.“
- Ein Satz darunter.
- Die Karten im **3×2-Raster** auf Desktop, 2 Spalten auf Tablet, 1 Spalte auf Mobil. Die Kartenoptik entspricht den V2-Cards (weiß, 1 px Rand, Radius 20).

| Nr | Station | Figur | Prüft | Klartext (Vorschlag, gern schärfen) |
|---|---|---|---|---|
| 01 | Absender | `hub` | SPF | Darf dein Server überhaupt für deine Domain senden? |
| 02 | Unterschrift | `vault` | DKIM | Ist die Mail digital unterschrieben und unterwegs unverändert? |
| 03 | Schutzregel | `padlock` | DMARC | Was passiert mit Fälschungen in deinem Namen? |
| 04 | Server-Ruf | `router` | Sperrlisten, rDNS | Steht dein Server auf einer schwarzen Liste? |
| 05 | Transport | `relay` | TLS | Kam die Mail verschlüsselt an? |
| 06 | Posteingang | `sieve` | Spamfilter, Inhalt | Wie viele Spam-Punkte sammelt deine Mail? |

- **Aufbau jeder Karte:**
  - Figur oben, Seitenverhältnis 5:4.
  - Darunter die Nummer und das Kürzel in Mono (z. B. „01 · SPF“), der Titel in Fraunces und der Klartext.
  - Ein Link zum passenden Ratgeber, sofern es ihn gibt. Keine toten Links.
- **Zwischen den Karten** auf Desktop eine dünne Verbindungslinie oder Pfeilfolge in Reihe 1 und 2. Sie zeigt den Weg und ist dezent. Optional füllt sie sich beim Reinscrollen einmal grün, wie im Ergebnis.
- **Unter dem Raster** eine Zeile mit 3 Schritten: „01 Adresse kopieren · 02 Ganz normal schicken · 03 Ergebnis in 30 s“, dazu ein Ghost-Button „Jetzt testen ↑“, der zum Hero scrollt und die Adresse fokussiert.
- **Mobil:** Es gibt keine Maus. Die Figur läuft einmal mit `play: true`, wenn die Karte zu 50 % sichtbar ist, dann Ruhe.
- **Reduced Motion:** Die Figur bleibt statisch, kein `play`.
- **Server-Rendering:** Die Box mit 5:4 wird reserviert, CLS bleibt 0. Ohne JS bleibt die Box leer, der Text ist trotzdem voll sichtbar und crawlbar. `label` pro Figur sinnvoll auf Deutsch setzen (Barrierefreiheit).

## Weitere Stellen (gleicher Auftrag, klein halten)
- **Warten auf die Mail** (Prüf-Modus, bevor die Mail da ist): Figur `dish` klein im Mail-Fenster-Fuß oder daneben, Text „Wir lauschen …“. Nur wenn es ruhig aussieht, sonst weglassen und begründen.
- **404 und abgelaufener Ergebnis-Link:** Figur `loupe` mit „Hier finden wir nichts mehr.“
- **Ratgeber-Artikel:** Header-Figur passend zum Thema (SPF → `hub`, DKIM → `vault`, DMARC → `padlock`, Sperrlisten → `router`).
- **Optional:** Mit dem hairline-Skill (`npx skills add lucasmarkes/hairline`, dann `/hairline-create`) eine eigene Figur „Umschlag mit Prüf-Haken“ in unserem Logo-Stil erzeugen. Einsatz als Figur für Station „Absender“ oder fürs OG-Bild. Nur übernehmen, wenn sie wirklich gut aussieht. Ergebnis als Screenshot in `docs/redesign/hairline/`.

## Ablauf
1. Paket installieren und die Bundle-Größe messen. Liegt sie deutlich über 25 kB gzip, erst melden, nicht einbauen.
2. Sektion bauen → Mobil, Reduced Motion → weitere Stellen.
3. **Tests:** Playwright-Screenshots für Desktop 1440 und Mobil 390, Hover-Zustand einer Karte. Lighthouse mobil Performance ≥ 95, CLS 0, A11y 100.
4. In `CLAUDE.md` (Design) einen Absatz „Illustrationen: hairline-Figuren“ ergänzen: welche Figur wofür, Farben, Ladeverhalten. In `docs/STATUS.md` pflegen. Die Lizenz-Info (MIT, Lucas Marques) in `LICENSE-CONTENT.md` oder bei den Third-Party-Hinweisen ergänzen.
5. Committen, **nicht deployen**. Server, DNS und Accounts nicht anfassen, nichts kaufen.
