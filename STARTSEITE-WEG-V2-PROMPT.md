# Startseite: „Der Weg deiner Mail“ als eine eigene Szene (ersetzt die 6 Einzelkarten)

Projektordner: `/Users/dennisbuchwald/Arbeitsplatz/01_Code/e-mail-check.de`
Gilt zusätzlich zu `STARTSEITE-WEG-PROMPT.md` und ersetzt dort den Abschnitt „Sektion“. Die 6 Karten mit fertigen Figuren (hub, vault, padlock …) **wieder entfernen**: zu generisch, nicht mail-spezifisch, sie wirken wie sechs Einzelteile. Arbeite autonom: Plan kurz zeigen, dann umsetzen.

## Ziel
**Eine einzige, eigens gezeichnete isometrische Linienszene** im hairline-Stil. Sie zeigt den kompletten Weg einer Mail als zusammenhängende Strecke, und ein Umschlag wandert sie beim Scrollen entlang.

## Die Szene erstellen
- Den hairline-Skill installieren (`npx skills add lucasmarkes/hairline`) und mit `/hairline-create` eine eigene Figur `mailroute` erzeugen. Stil, Strichstärke, Isometrie und Mausreaktion wie die Bibliotheksfiguren, gleiche API (`mailroute(el, { progress, play, theme, label })`).
- **Inhalt**, von links hinten nach rechts vorn auf einer durchgehenden Bahn (Schiene oder Förderband):
  1. **Absender:** Laptop mit offenem Mail-Fenster.
  2. **Unterschrift:** Stempel oder Siegel, das auf den Umschlag drückt.
  3. **Schutzregel:** Schranke oder Tor mit Schloss, öffnet sich.
  4. **Server-Ruf:** Serverschrank mit Liste beziehungsweise Klemmbrett daneben.
  5. **Transport:** geschlossenes Rohr oder Tunnel (verschlüsselt). Der Umschlag verschwindet kurz darin.
  6. **Posteingang:** Sieb über einem Postfach-Fach. Der Umschlag fällt durch ins Fach.
- **Der Umschlag** hat die Form unseres Logos (Rechteck mit Lasche). Er ist das einzige bewegte Objekt auf der Bahn. Neben jeder Station ein kleiner Kreis, der zum grünen Häkchen-Punkt (`#02CA50`) wird, sobald der Umschlag vorbei ist. Das ist die einzige Farbe in der Szene. Am Ende ploppt am Fach der grüne Punkt wie beim Logo.
- **Steuerung:** Ein Parameter `progress` von 0 bis 1 bestimmt Position des Umschlags und Zustand der Stationen. Zusätzlich die normale Mausreaktion der Bibliothek, also leichte Parallaxe oder Neigung.
- Linien `#111113`, Hilfslinien `#C9C9CF`, viel Luft. Keine Texte in der Grafik, die Beschriftung kommt aus HTML. Isometrie und Strich müssen exakt zu den hairline-Figuren passen.
- **Qualität vor allem:** Erst die statische Szene als Screenshot in `docs/redesign/hairline/` ablegen und selbst kritisch prüfen (Proportionen, Lesbarkeit der Stationen, nicht überladen). Lieber weniger Details als Gewusel. Wenn sie nach 3 Iterationen nicht hochwertig aussieht: abbrechen, bei der alten Lösung bleiben und das melden.

## Sektion (Scrollytelling)
- Direkt unter dem Hero. Eyebrow `DER WEG DEINER MAIL`, H2 „Sechs Stationen bis ins Postfach. Wir prüfen jede.“
- **Desktop:** zwei Spalten. Links (etwa 60 %) die Szene `position: sticky`, vertikal zentriert. Rechts 6 Textschritte, jeder etwa 60vh hoch:
  - Nummer und Kürzel in Mono („01 · SPF“), Titel in Fraunces, 1–2 Sätze Klartext, Link „Mehr zu SPF ›“ zum Ratgeber (nur wenn er existiert).
  - Der aktive Schritt ist Ink, die anderen gedimmt (`#B4B5BA`).
  - `progress` folgt dem Scroll durch die Schritte. Primär CSS Scroll-driven, Fallback IntersectionObserver plus rAF. Keine Animations-Bibliothek.
- **Mobil:** Die Szene klebt oben in kleiner Höhe (etwa 40svh), die Schritte scrollen darunter. Ist das zu eng: Szene einmal mit `play` durchlaufen lassen, Schritte als normale Liste.
- **Reduced Motion:** Die Szene steht statisch im Endzustand (alle Haken grün), Schritte als normale Liste.
- **Server-Rendering und SEO:** Alle Texte stehen als echtes HTML im DOM. Die Szenen-Box hat ein festes Seitenverhältnis, CLS 0. Die Szene hat ein `label` (z. B. „Illustration: der Weg einer Mail vom Absender bis ins Postfach“).
- Unter der Sektion die Zeile „01 Adresse kopieren · 02 Ganz normal schicken · 03 Ergebnis in 30 s“ und ein Ghost-Button „Jetzt testen ↑“ wie gehabt.

## Weiterverwendung
Dieselbe Szene (oder ein Ausschnitt mit `progress` fix):
- im Ergebnis-Zustandsweg später als Option (nur notieren in `docs/STATUS.md`, nicht bauen),
- als OG-Bild-Motiv (statisch, Endzustand),
- im Prüf-Modus (Umschlag bewegt sich in Schleife, solange wir prüfen), nur wenn es ruhig wirkt.

## Ablauf
1. Den Skill holen, die Szene iterieren und den Screenshot ablegen.
2. Die Sektion bauen, die alten 6 Karten entfernen.
3. Mobil, Reduced Motion und Fallback umsetzen.
4. **Tests:**
   - Playwright-Screenshots bei progress 0, 0,5 und 1 in Desktop und Mobil.
   - Lighthouse mobil Performance ≥ 95, CLS 0, A11y 100.
   - Bundle-Größe der Szene nennen.
5. `CLAUDE.md` (Abschnitt Illustrationen) und `docs/STATUS.md` aktualisieren. Committen, **nicht deployen**.
