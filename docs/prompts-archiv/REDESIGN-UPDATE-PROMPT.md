# Redesign-Update: Hero V1, Wortmarke, Animationen

Stand 21.10.2026. Ergänzt `REDESIGN-PROMPT.md`. Wo sich beide widersprechen, gilt diese Datei.

## Ziel
Die Startseite wird an den finalen Hero angepasst und bekommt die neue Wortmarke „mail / check“ plus zwei Animationen. Die Prüf-Logik, die API und das Ergebnis bleiben, wie sie sind.

## Referenzen (zuerst ansehen)
- `design/redesign/hero-animation-prototyp.html`: lauffähiger Prototyp. Im Browser öffnen und scrollen. Das ist die Vorlage für Optik und Timing.
- `design/redesign/hero-final.dc.html`: dasselbe als Canvas-Board.
- `brand/wortmarke.svg`, `brand/wortmarke-weiss.svg`: Wortmarke als Pfade (keine Schrift nötig).
- `brand/wortmarke-vorschau.png`: Vorschau.
- `brand/logo-mark.svg`: Bildmarke allein (Favicon, App-Icon, sehr kleine Größen).

## 1. Was sich gegenüber dem Live-Stand ändert
1. **Statusleiste statt Navigation.**
   - Links: die Wortmarke, 52 px hoch, verlinkt auf `/`.
   - Mitte: eine Mono-Pille mit pulsierendem grünem Punkt: „SYSTEM BEREIT · SERVER DE · X TESTS HEUTE“.
   - Rechts: nur „Ratgeber ▾“ (Dropdown mit den Ratgeber-Seiten).
   - Keine weiteren Links. Kein Hintergrund und keine Linie.
2. **Zähler nur echt.** X kommt aus der Datenbank: Tests seit 0 Uhr Europe/Berlin, gecacht für 60 s. Ist der Wert unter 50 oder nicht verfügbar, entfällt das Segment „· X TESTS HEUTE“. Nie eine erfundene Zahl anzeigen.
3. **Punktraster statt Aura.**
   - `radial-gradient(#CFCFD6 1px, transparent 1.2px)`, Raster 22 px.
   - Radiale Maske, die nach außen ausblendet: `ellipse 60% 55% at 50% 42%`.
   - Die Aura komplett entfernen.
4. **Mail-Fenster statt Eingabefeld.**
   - Card „Neue Nachricht“, rechts daneben „TESTMAIL“ in Mono.
   - Zeile „An“: Testadresse in Mono 21 px, Button „Kopieren“.
   - Zeile „Betreff“: „Egal. Am besten so, wie du sonst schreibst.“
   - Fuß: Live-Status „Wir warten auf deine Mail.“ mit pulsierendem Punkt, Button „Mail ist raus →“ in Ink.
   - Die bestehende Logik bleibt: Adresse erzeugen, SSE und Polling.
5. **Vertrauenszeile mit grünen Häkchen-Kreisen:**
   - Grüner Kreis 18 px `#02CA50` mit Ink-Häkchen.
   - Texte: „Server in Deutschland“, „Testmail sofort gelöscht“, „Keine Cookies, kein Konto“.
   - Nur Aussagen, die technisch stimmen. Sonst anpassen.
6. **Inhalt leicht über der Mitte.** Etwa 56 px Abstand unter der Statusleiste. Unten der Hinweis „So funktioniert's ⌄“.

## 2. Wortmarke „mail / check“
- **Form:**
  - Zwei Zeilen, alles klein, Fraunces 700 (opsz 96, SOFT 0, WONK 0). Das ist die Headline-Schrift.
  - „check“ ist die längere Zeile.
  - Die Bildmarke (Umschlag mit grünem Prüf-Punkt) steht rechtsbündig auf der „mail“-Zeile. Der Umschlag ist so hoch wie das x-Höhe.
- **Einbau:**
  - Immer die Pfad-SVGs verwenden, nicht als Text setzen.
  - Für die Animation das SVG **inline** einbauen und in Gruppen teilen: `.wm-text` (beide Wörter), Umschlag, `.badge` (grüner Kreis plus Häkchen) und den Knockout-Kreis in der Maske.
- **Varianten:**
  - Ink auf Hell (`wortmarke.svg`), Weiß auf Dunkel (`wortmarke-weiss.svg`).
  - Unter 32 px Höhe nur die Bildmarke verwenden.
  - Favicon und App-Icon bleiben wie in `brand/`.
- Footer und OG-Bild auf die neue Wortmarke umstellen. Den alten Schriftzug „e-mail-check.de“ als Logo entfernen. Der Domainname darf als Text bleiben, z. B. im Footer und im Title.

## 3. Animation beim Laden: Prüf-Punkt springt ins Logo
- Beim ersten Rendern fehlt der grüne Punkt am Umschlag.
- Nach 450 ms skalieren Punkt und Knockout-Ring gemeinsam von 0 auf 1,15 auf 1. Dauer 550 ms, `cubic-bezier(.34,1.56,.64,1)`, `transform-box: fill-box; transform-origin: center`.
- Ab 850 ms zeichnet sich das Häkchen: `pathLength="1"`, `stroke-dashoffset` von 1 auf 0, 350 ms.
- Nur CSS, kein JS. Läuft einmal pro Seitenaufruf.

## 4. Animation beim Scrollen: nur in der Wortmarke
Alles passiert in der Fläche der Wortmarke oben links. Der Hero selbst bleibt unverändert, es gibt keine Vollbild-Animation.

- Die Statusleiste ist `position: sticky; top: 0`.
- **0–90 px Scroll:** „mail / check“ (`.wm-text`) blendet aus und gleitet 60 px nach links.
- **20–160 px Scroll:** Die Bildmarke (Umschlag plus grüner Prüf-Punkt, Gruppe `.mark-grow`) wächst auf etwa das 3-Fache. Sie füllt die Fläche der Wortmarke, steht linksbündig und ist vertikal zentriert. Easing `cubic-bezier(.55,0,.25,1)`. Ergebnis: das reine Logo mit Haken.
- **60–160 px Scroll:** Die Statusleiste bekommt einen Hintergrund `rgba(255,255,255,.86)` mit 1 px Linie unten.
- Beim Hochscrollen läuft alles rückwärts. Oben steht wieder die volle Wortmarke.

**Technik:**
- CSS Scroll-driven Animations: `animation-timeline: scroll(); animation-range: <px> <px>`. Nur `transform` und `opacity`.
- `transform-origin` liegt an der linken oberen Ecke der Bildmarke (in SVG-Einheiten). Das Ziel berechnet sich aus der viewBox der Wortmarke, siehe Prototyp.
- Fallback mit `@supports not (animation-timeline: scroll())`: kleines JS mit passivem Scroll-Listener plus rAF. Ab 80 px bekommt die Leiste die Klasse `is-compact`, dann CSS-Transition 300 ms auf denselben Endzustand.
- `prefers-reduced-motion: reduce`: harter Wechsel ohne Bewegung, kein Pop beim Laden.
- Mobil identisch, nur kleiner (Wortmarke 40 px hoch).
- Der Link auf `/` und das `aria-label` „mail check, Startseite“ bleiben in beiden Zuständen.

## 5. Arbeitsweise
1. `CLAUDE.md`, `REDESIGN-PROMPT.md` und diese Datei lesen, den Prototyp im Browser ansehen.
2. Einen kurzen Plan schreiben (Dateien, Komponenten) und dann umsetzen, ohne auf mich zu warten.
3. Lokal testen:
   - Desktop 1440 und 1280, Mobil 390.
   - Chrome, Safari und Firefox (Fallback).
   - Reduced Motion.
   - Lighthouse: Performance ≥ 95, A11y 100.
4. Screenshots der Wortmarke bei 0, 60, 120 und 200 px Scroll in `design/redesign/umsetzung/` ablegen.
5. In `CLAUDE.md` das Design-Kapitel aktualisieren: Wortmarke, Statusleiste, Punktraster, Mail-Fenster, Animationen. Veraltetes (Aura, alte Navigation, alter Schriftzug) streichen.
6. Committen. **Nicht deployen.** Server, DNS und Accounts nicht anfassen, nichts kaufen. Am Ende melden, was fertig ist und was offen ist.
