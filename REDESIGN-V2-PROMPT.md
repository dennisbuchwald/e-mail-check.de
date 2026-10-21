# Redesign V2: Auftrag für Claude Code (final, 21.10.2026)

Projektordner: `/Users/dennisbuchwald/Arbeitsplatz/01_Code/e-mail-check.de`

Redesign V1 ist umgesetzt und live (cleaner SaaS-Stil, Tokens in `apps/web/src/styles/global.css`). V2 ist die letzte Design-Runde. Sie baut auf V1 auf und ersetzt den Hero, die Navigation und das Logo. Danach ist das Design abgeschlossen. Neue Design-Ideen kommen nur noch über `docs/STATUS.md` als Vorschlag, nicht als Umbau.

Arbeite **autonom** von Anfang bis Ende. Zeig am Anfang kurz deinen Plan und setze ihn dann ohne Rückfrage um. Stopp nur bei den Verboten unten.

## 0. Verbindliche Vorlagen
| Datei | Was |
|---|---|
| `design/redesign/hero-animation-prototyp.html` | **Lauffähiger Prototyp** für Hero, Statusleiste, Wortmarke und beide Animationen. Im Browser öffnen und scrollen. Optik und Timing 1:1 übernehmen. |
| `design/redesign/hero-final.dc.html` | Dasselbe als Canvas-Board |
| `brand/wortmarke.svg`, `brand/wortmarke-weiss.svg`, `brand/wortmarke-vorschau.png` | Neue Wortmarke als Pfade |
| `brand/logo-mark.svg` und Favicons | Bildmarke allein, bleibt |
| `design/redesign/start-final-sektionen.dc.html`, `ergebnis-final.dc.html` | Bleiben gültig aus V1 |
| `verworfen-*`, `start-option-*`, `ergebnis-neu` | Nur Archiv, nicht umsetzen |

Alte Aufträge liegen in `docs/prompts-archiv/`. Bei Widersprüchen gilt **diese Datei**.

## 1. Entscheidung Animationen: keine Bibliothek
- **Kein GSAP, kein Framer Motion, kein Lottie.** Alle Animationen der Seite sind kurz und nur `transform`/`opacity`: Lade-Pop, Wortmarke beim Scrollen, Prüf-Checkliste, Score-Count-up. CSS plus ein paar Zeilen JS reichen dafür. Jedes Kilobyte zählt für Lighthouse und SEO.
- **Standard:**
  - CSS-Keyframes und Transitions.
  - Für scroll-gebundene Effekte CSS Scroll-driven Animations (`animation-timeline: scroll()`) mit einem kleinen JS-Fallback (passiver Scroll-Listener plus `requestAnimationFrame`).
  - Für den Count-up ein eigener rAF-Loop, unter 30 Zeilen.
- **Immer:** `prefers-reduced-motion: reduce` respektieren. Keine Layout-Animationen (`width`, `top` …), CLS 0.
- **GSAP erst prüfen, wenn** später etwas mit Timeline-Choreografie kommt, die CSS nicht sauber schafft, z. B. eine animierte Ergebnis-Story oder ein Erklärvideo-artiger Ablauf. Dann vorher mit mir abstimmen.
- Diese Regel in `CLAUDE.md` unter Design aufnehmen.

## 2. Statusleiste statt Navigation (alle Seiten)
- `position: sticky; top: 0`, Höhe 76 px, Innenabstand 40 px. Kein Kasten. Oben transparent, beim Scrollen weiß mit 86 % Deckkraft und 1 px Linie `#EDEDF0`.
- **Links:** die Wortmarke, 52 px hoch, mobil 40 px. Link auf `/`, `aria-label` „mail check, Startseite“.
- **Mitte:** Mono-Pille mit pulsierendem grünem Punkt: „SYSTEM BEREIT · SERVER DE · X TESTS HEUTE“. Mobil ausgeblendet oder nur „● BEREIT“.
- **Rechts:** nur „Ratgeber ▾“. Das Dropdown enthält die Ratgeber- und Anleitungsseiten, per Tastatur bedienbar.
- **Zähler nur echt:**
  - X = Tests seit 0 Uhr Europe/Berlin aus der Datenbank, serverseitig 60 s gecacht.
  - Unter 50 oder nicht verfügbar entfällt das Segment „· X TESTS HEUTE“.
  - Nie eine erfundene Zahl anzeigen.
  - Der Endpoint ist öffentlich, liefert keine personenbezogenen Daten und ist rate-limitiert.

## 3. Hero der Startseite
Er ersetzt den V1-Hero mit Aura. Die Aura komplett entfernen, aus dem Code und aus `CLAUDE.md`.
- `min-height: 100svh`. Der Inhalt sitzt leicht über der Mitte, etwa 56 px unter der Leiste.
- **Hintergrund:** Punktraster `radial-gradient(#CFCFD6 1px, transparent 1.2px)`, 22 px Raster, radiale Maske `ellipse 60% 55% at 50% 42%`, nach außen ausblendend.
- **H1** „Kommt deine Mail an?“ (Fraunces 680, 68 px, mobil etwa 40 px) und ein Satz darunter.
- **Mail-Fenster** (Card, Radius 18 px):
  - Kopf: „Neue Nachricht“, rechts „TESTMAIL“ in Mono.
  - Zeile „An“: Testadresse in Mono 21 px, Button „Kopieren“ mit Feedback „Kopiert ✓“.
  - Zeile „Betreff“: „Egal. Am besten so, wie du sonst schreibst.“
  - Fuß: pulsierender Punkt mit „Wir warten auf deine Mail.“, Button „Mail ist raus →“ (Ink).
  - Die bestehende Logik bleibt: Adresse erzeugen, SSE und Polling, Prüf-Modus.
- **Vertrauenszeile:** grüne Kreise 18 px `#02CA50` mit Ink-Häkchen. Texte: „Server in Deutschland“, „Testmail sofort gelöscht“, „Keine Cookies, kein Konto“. Nur stehen lassen, was technisch stimmt.
- Unten „So funktioniert's ⌄“ mit wippendem Pfeil, Anker auf die Sektion.
- **Grüner Schein hinter dem Mail-Fenster (Ergänzung 21.10.2026):**
  - Liegt unter der Card und über dem Punktraster: ellipsenförmig, ca. 760 × 300 px, zentriert unter der Card und leicht nach unten versetzt, damit er unten herausschimmert. Mobil ca. 420 × 220 px.
  - CSS: `radial-gradient(closest-side, rgba(2,202,80,0.14), rgba(2,202,80,0))`, `filter: blur(30px)`, `pointer-events: none`.
  - Ruhezustand: keine Bewegung.
  - Prüf-Modus: Solange geprüft wird, atmet der Schein (opacity 0,7 → 1, scale 0,96 → 1,04, 2,4 s ease-in-out, alternate, infinite). Nur transform/opacity.
  - Ergebnis: Der Schein nimmt kurz die Ergebnisfarbe an (Grün/Orange/Rot, gleiche Deckkraft) und blendet dann über 1,5 s auf 0 aus.
  - `prefers-reduced-motion`: statisch, kein Atmen.
  - Kein Ersatz für die Aura aus V1, die bleibt entfernt. Nur dieser eine Schein.
- **Mobil (390 px):** Adresse darf umbrechen oder wird kleiner, nie abgeschnitten. Buttons volle Breite.

## 4. Wortmarke „mail / check“
- Zwei Zeilen, klein, Fraunces 700 (opsz 96, SOFT 0, WONK 0) als Pfade. „check“ ist die längere Zeile. Die Bildmarke steht rechtsbündig auf der „mail“-Zeile und ist so hoch wie die x-Höhe.
- In der Statusleiste **inline als SVG** einbauen, aufgeteilt in Gruppen wie im Prototyp: `.wm-text`, `.mark-grow` (Umschlag plus Badge), `.badge-load`, `.ko-load` (Knockout-Kreis in der Maske), `.check-load`. Die Masken-IDs müssen pro Seite eindeutig sein.
- Unter 32 px Höhe nur die Bildmarke verwenden.
- Den Footer auf `wortmarke-weiss.svg` beziehungsweise `wortmarke.svg` umstellen, je nach Hintergrund. Den alten Logo-Schriftzug „e-mail-check.de“ überall entfernen. Der Domainname darf als Text bleiben, z. B. im Title und im Impressum.
- **OG-Bild neu:** 1200×630, Wortmarke plus H1 auf Weiß mit Punktraster, als statische PNG unter `public/`.
- Favicon und App-Icons bleiben, wie sie in `brand/` sind.

## 5. Animation A: Prüf-Punkt springt beim Laden ins Logo
- Beim ersten Rendern fehlen der grüne Punkt und der Knockout-Ring.
- Ab 450 ms skalieren Punkt und Ring gemeinsam von 0 auf 1,15 auf 1. Dauer 550 ms, `cubic-bezier(.34,1.56,.64,1)`, `transform-box: fill-box; transform-origin: center`.
- Ab 850 ms zeichnet sich das Häkchen: `pathLength="1"`, `stroke-dashoffset` von 1 auf 0, 350 ms.
- Nur CSS. Läuft bei jedem Seitenaufruf, bei Reduced Motion nicht.

## 6. Animation B: Wortmarke wird beim Scrollen zum Logo
Alles passiert **nur in der Fläche der Wortmarke**. Der Hero und der Rest der Seite bleiben unberührt.
- **0–90 px Scroll:** `.wm-text` blendet aus und gleitet 60 px nach links.
- **20–160 px Scroll:** `.mark-grow` skaliert auf das 3-Fache, linksbündig und vertikal zentriert in der Wortmarken-Fläche. Easing `cubic-bezier(.55,0,.25,1)`. `transform-origin` ist die linke obere Ecke der Bildmarke in SVG-Einheiten. Die Werte stehen im Prototyp.
- **60–160 px Scroll:** Die Leiste bekommt Hintergrund und Linie.
- Beim Hochscrollen läuft alles rückwärts.
- **Technik:**
  - `animation-timeline: scroll(); animation-range: <px> <px>` in `@supports (animation-timeline: scroll())`.
  - **Fallback** (Firefox, ältere Browser): JS setzt ab 80 px `.is-compact` an der Leiste, dazu CSS-Transition 300 ms auf denselben Endzustand.
  - Reduced Motion: harter Wechsel ohne Bewegung.
- Gilt auf **allen Seiten** mit Statusleiste. Auf Ergebnis- und Ratgeberseiten verhält es sich genauso.

## 7. Was aus V1 bleibt
Folgendes unverändert lassen und nur prüfen, ob es zum neuen Hero passt (Abstände, Schriftgrößen):
- Sektionen „Was wir prüfen“ und „Was bedeutet die Zahl?“
- Prüf-Modus
- Ergebnisansicht mit Mail-Kopf, Teil-Scores und Aktionsplan
- Scoring mit Ausnahme-Regel
- Ratgeber-Seiten

Steht in V1 irgendwo noch etwas offen, in `docs/STATUS.md` nachsehen und mit erledigen.

## 8. Ablauf
1. `CLAUDE.md`, diese Datei und den Prototyp ansehen. Den Plan zeigen (Komponenten und Dateien), dann umsetzen.
2. **Reihenfolge:**
   1. Wortmarke-Komponente
   2. Statusleiste mit Zähler-Endpoint
   3. Hero
   4. Animation A
   5. Animation B mit Fallback
   6. Footer und OG-Bild
   7. Aura-Code entfernen
   8. Feinschliff der Sektionen
3. **Tests:**
   - Unit-Test für den Zähler (Zeitzone, Schwelle 50, Cache).
   - Playwright-Screenshots:
     - Startseite in 1440, 1280 und 390.
     - Wortmarke bei 0, 60, 120 und 200 px Scroll.
     - Reduced Motion.
     - Firefox-Fallback.
   - Lighthouse mobil: Performance ≥ 95, A11y 100, SEO 100. CLS 0.
   - Tastatur: Fokus sichtbar, Dropdown bedienbar.
   - Kontrast Text ≥ 4,5:1.
4. Vorher/Nachher-Screenshots in `docs/redesign/v2/` ablegen.
5. **Doku:**
   - `CLAUDE.md` Abschnitt 9 auf V2 bringen (Statusleiste, Punktraster, Mail-Fenster, Wortmarke, Animationen, keine Animationsbibliothek). Aura, alte Navigation und alter Schriftzug streichen. Den Abschnitt „Update 21.10.2026“ in Abschnitt 9 einarbeiten und auflösen.
   - In `docs/STATUS.md` V2 als abgeschlossen eintragen.
6. Committen mit sauberen Commits pro Schritt. Am Ende kurz melden, was fertig ist, was offen ist und welche Abweichungen es gab (mit Begründung).

## Verboten ohne meine Freigabe
- Deployen, den Hetzner- oder n8n-Server anfassen, DNS oder Domains ändern, etwas kaufen, Accounts anlegen.
- Rechtstexte erfinden oder ändern (Impressum, Datenschutz).
- Secrets ins Repo legen.
- Fake-Zahlen oder erfundene Bewertungen anzeigen.
