# Feinschliff „Der Weg deiner Mail“ (21.10.2026)

Projektordner: `/Users/dennisbuchwald/Arbeitsplatz/01_Code/e-mail-check.de`
Die Szene aus `STARTSEITE-WEG-V2-PROMPT.md` ist eine sehr gute Basis. Jetzt kommt der Feinschliff: mehr Liebe in jedem Schritt und saubere Zeichnung. Arbeite autonom. Pro Punkt Vorher/Nachher-Screenshots in `docs/redesign/hairline/feinschliff/` ablegen und selbst kritisch vergleichen.

## 1. Zeichnung und Layout
- **Größer und mittiger:**
  - Die Szene ist auf Desktop zu klein und sitzt zu tief, darüber ist viel Leerraum. Sie soll etwa 60 % der Breite einnehmen (≈ 680–720 px breit). Die sticky-Box ist vertikal mittig im Viewport (`top: calc(50vh - Höhe/2)`).
  - Den Abstand zwischen H2 und Szene verkleinern.
  - Szene und aktiver Text sollen auf einer Höhe liegen.
- **Laptop neu zeichnen:**
  - Er wirkt flach und schief. Gewünscht: korrekte Isometrie, Display etwa 100–105° geöffnet, sichtbares Scharnier, Displayrahmen mit Innenkante.
  - Tastaturfeld als feines Raster und Trackpad, Unterseite mit Materialstärke.
  - Auf dem Display ein kleines Mail-Fenster (An-Zeile, 2–3 Textlinien, Senden-Button), passend zu unserem Mail-Fenster im Hero.
  - Proportionen an der hairline-Figur `laptop` aus der Bibliothek ausrichten.
- **Alle Objekte auf Isometrie prüfen:**
  - Gleicher Winkel (30°), gleiche Strichstärke, gleiche Lichtkanten-Logik wie die hairline-Figuren. Stempel-Arm, Schranke, Serverschrank, Rohr und Postfach nachziehen, wo Kanten nicht sauber aufeinandertreffen.
  - Doppelte oder unsaubere Linien entfernen.
- **Umschlag:**
  - Er ist zu klein und zu schwach. Gefüllt in Ink (`#111113`) mit weißer Lasche, genau wie unser Logo, nur isometrisch.
  - Etwa 1,5× größer als jetzt. Er bekommt einen dezenten Schatten (Ellipse) auf der Bahn.
- **Stationsmarker:**
  - Statt der winzigen grünen Ellipsen: kleine Kreise, aufrecht und nicht flachgedrückt, 14–16 px.
  - Offen: grauer, gestrichelter Kreis, wie im Prüf-Modus.
  - Erledigt: grüner Kreis `#02CA50` mit Ink-Häkchen, das sich zeichnet. Dazu ein Bounce mit `cubic-bezier(.34,1.56,.64,1)`, genau wie im Logo-Pop.

## 2. Mehr Liebe pro Schritt (Mikro-Momente, an `progress` gekoppelt)
Jede Station bekommt einen kleinen eigenen Moment, wenn der Umschlag ankommt (≈ 0,3–0,6 s, nur transform/opacity bzw. SVG-Attribute):
1. **Absender:**
   - Auf dem Laptop-Display tippen sich die Textlinien nacheinander ein.
   - Der Senden-Button wird kurz gedrückt.
   - Der Umschlag gleitet aus dem Laptop auf die Bahn, mit 2–3 kurzen „Speed-Lines“.
2. **Unterschrift:**
   - Der Stempel fährt herunter und drückt auf den Umschlag. Dabei staucht sich der Umschlag kurz, und es erscheinen 3 kleine Aufprall-Striche.
   - Danach trägt der Umschlag ein kleines Siegel (Punkt oder Kreis auf der Lasche).
3. **Schutzregel:**
   - Das Schloss an der Schranke klickt auf, und die Schranke hebt sich.
   - Optional und sehr dezent: Ein gestrichelter „Fake“-Umschlag hinter unserem prallt an der Schranke ab und verblasst. Das zeigt, was DMARC tut.
4. **Server-Ruf:**
   - Die LEDs am Serverschrank blinken kurz nacheinander.
   - Auf dem Klemmbrett haken sich 3 Zeilen ab.
5. **Transport:**
   - Der Umschlag fährt ins Rohr. Ringe beziehungsweise Striche laufen als Puls durchs Rohr.
   - Am Ende kommt er mit einem kleinen Schloss-Symbol kurz neben sich heraus (verschlüsselt).
6. **Posteingang (Finale):**
   - Der Umschlag fällt durchs Sieb ins Fach. Das Fach federt einmal.
   - Dann steigt der Umschlag ein Stück aus dem Fach auf und dreht sich frontal zum Betrachter. Er wird zu **unserem Logo**: Ink-Umschlag mit Lasche.
   - Oben rechts ploppt der **grüne Prüf-Punkt mit Knockout-Ring** auf, und das Häkchen zeichnet sich, exakt wie die Lade-Animation in der Statusleiste: gleiche Kurve, gleiche Dauern.
   - Optional ein ganz feiner grüner Puls-Ring um den Punkt, einmalig.
   - Rechts erscheint im Text statt nur „Posteingang“ zusätzlich: **„Angekommen.“** und der CTA „Jetzt deine Mail testen ↑“.

**Regeln:**
- Die Momente laufen per Scroll vorwärts und rückwärts sauber. Kein Ruckeln, kein Zustand, der hängen bleibt.
- Die Mausreaktion (Parallaxe) bleibt dezent.
- Reduced Motion: statischer Endzustand mit Logo und grünem Punkt.
- Mobil: dieselben Momente, nur kleiner. Bei schwachen Geräten (`hardwareConcurrency <= 4`) nur die Haken, ohne Mikro-Momente.
- Keine Animations-Bibliothek. Performance prüfen: 60 fps im Chrome-Performance-Panel beim Durchscrollen, sonst vereinfachen.

## 3. Text-Spalte
- Der aktive Schritt hat volle Deckkraft, die anderen 30 %. Der Wechsel ist weich (200 ms).
- Die Schrittabstände so wählen, dass jeweils nur 1–2 Schritte sichtbar sind, etwa 70vh pro Schritt.
- Die Kürzel einheitlich schreiben: „01 · SPF“, „04 · Sperrlisten & rDNS“, „06 · Spamfilter & Inhalt“.

## Ablauf
1. Zeichnung und Layout (Punkt 1) zuerst. Screenshot, selbst bewerten, bei Bedarf iterieren (max. 3 Runden).
2. Dann die Mikro-Momente von Station 1 bis 6, zuletzt das Finale.
3. **Tests:**
   - Playwright-Screenshots bei progress 0, 0,17, 0,33, 0,5, 0,67, 0,83 und 1 auf Desktop und Mobil.
   - Ein kurzes Video oder GIF der Sequenz, falls möglich.
   - Lighthouse mobil Performance ≥ 95, CLS 0.
4. `docs/STATUS.md` pflegen. Committen, **nicht deployen**. Am Ende melden, was umgesetzt ist und was du bewusst weggelassen hast.
