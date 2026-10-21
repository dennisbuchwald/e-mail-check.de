# e-mail-check.de – Projektgrundlage für die agentische Entwicklung

Stand: 20.10.2026 · Owner: Dennis Buchwald

Diese Datei ist die Quelle der Wahrheit für das Projekt. Wer hier entwickelt (Mensch oder Agent), liest sie zuerst.
Entscheidungen, die sich ändern, werden hier aktualisiert.

---

## 0. Arbeitsweise für den Agenten

- **Vor dem ersten Code:** Den Tech-Stack (Abschnitt 8) kritisch neu bewerten und mit Dennis besprechen. Der Stack ist eine Empfehlung, keine Entscheidung. Erst nach Freigabe loslegen.
- In kleinen, lauffähigen Schritten arbeiten. Nach jedem Meilenstein kurz zusammenfassen, was steht und was als Nächstes kommt.
- Bei echten Produkt- oder Design-Entscheidungen Dennis fragen, technische Details selbst entscheiden und begründen.
- Oberflächentexte immer auf Deutsch, Ansprache **Du**, Klartext statt Fachbegriff.
- Nichts an Datenschutz-Zusagen aufweichen (Abschnitt 6), ohne es mit Dennis zu klären.
- Keine Secrets ins Repo. `.env.example` pflegen.

---

## 1. Was wir bauen

Ein **deutscher, DSGVO-konformer Mail-Tester für Nicht-Techniker**.
Man schickt eine Mail an eine Testadresse und bekommt in rund 30 Sekunden einen Score von 0–10, eine Ampel und eine Schritt-für-Schritt-Anleitung, wie man Probleme beim eigenen Anbieter behebt.

**Positionierung in einem Satz:**
„Du bist kein Techniker? Musst du auch nicht. Bring deine E-Mails auf 9 oder 10 von 10, ohne Fachchinesisch.“

**Vorbild:** mail-tester.com, ins Deutsche übertragen und radikal vereinfacht. Profi-Tools wie MXToolbox richten sich an Admins, wir nicht.

**Warum das Problem real ist:**
- Ca. 11.000 Suchen/Monat in DE zu „e mail check“, „mail tester“, „e mail spam check“ etc. (Seobility, Okt. 2026).
- Gmail (seit Feb. 2024) und Microsoft Outlook.com (seit Mai 2025) verlangen von Vielversendern SPF, DKIM und DMARC. Spamfilter bewerten diese Signale bei allen Absendern.

## 2. Zielgruppe

Webdesigner, Agenturen und Selbstständige, die Websites und Postfächer für Kunden einrichten, aber keine Mail-Experten sind.
Typische Situationen: Kontaktformular-Mails kommen nicht an, Anbieterwechsel (z. B. zu Microsoft 365), Newsletter-Tool einrichten.

**Job-to-be-done:** „Sag mir in einem Satz, ob alles passt, und wenn nicht, was ich genau wo eintragen muss.“

## 3. Rahmen

- Privates Side-Project von Dennis Buchwald, **nicht** dbw media.
- Impressum: gleiche Adresse wie dbw media, aber ohne Firmenname dbw media.
- Footer: „Ein Projekt von Dennis Buchwald“ mit Link auf dennisbuchwald.de.
- Domain: e-mail-check.de (Name = Suchbegriff, bewusst kein Markenaufbau).
- Wachstum: **rein über SEO**, kein Build in Public, keine Kurzvideos.
- Ziel: so schnell wie möglich Top 3 bei Google für „mail tester“ (Hauptkeyword der Startseite, entschieden 21.10.2026). „e mail check“ ist Nebenkeyword: Die SERP zeigt dort vor allem Adress- und Leak-Prüfer.
- Geld: erst Traffic. Später Google-Werbung (dann mit Cookie-Banner) und/oder Test-Pakete bzw. Komfort-Funktionen.

---

## 4. MVP-Umfang

### Drin
1. **Mail-Test:** einmalige Testadresse, automatisches Warten, Auswertung, Ergebnis.
2. **DNS-Schnellcheck ohne Testmail:** Domain eingeben → SPF und DMARC (und DKIM, falls Selektor bekannt) prüfen. Eigene SEO-Seiten `/dmarc-check`, `/spf-check`.
3. **Ergebnis:** Score 0–10 mit einer Nachkommastelle, Ampel, ein Satz Klartext, max. 5 Prüfpunkte, sortiert nach Schwere (Problem → Hinweis → OK).
4. **Anleitungen pro Anbieter** direkt aus dem Ergebnis heraus, mit Kopier-Button für DNS-Werte.
5. **Teilbarer Ergebnis-Link** für Kunden (zufällige ID, 7 Tage gültig, `noindex`). Das ist ein Unterscheidungsmerkmal.
6. **„Lass es einrichten“-Link** bei roten Ergebnissen (dezent), vorerst auf https://dennisbuchwald.de/kontakt.
7. **Unbegrenzt kostenlos**, mit Missbrauchsschutz nach Best Practice (z. B. Rate-Limit pro IP, Richtwert ~10 Tests/Stunde).
8. **Ratgeber- und Wissensseiten** (Abschnitt 7).
9. Impressum, Datenschutz, AVV-Vorlage zum Download.
10. Cookie-freie Statistik (z. B. Umami oder Plausible, selbst gehostet).

### Bewusst nicht im MVP
Login/Konto, Bezahlfunktion, Werbung, PDF-Bericht, DMARC-Monitoring-Abo, White-Label, API, englische Version.

### Launch-fertig, wenn
- Mail-Test liefert zuverlässig Ergebnisse,
- DNS-Schnellcheck läuft,
- ~20 Ratgeber sind fachlich geprüft online,
- Impressum und Datenschutz stehen.

---

## 5. User Flow und Prüfpunkte

1. **Start:** Nur eine Aktion. Testadresse + „Adresse kopieren“ + „Mail ist raus“. Vertrauenszeile: Server in Deutschland · sofort gelöscht · kein Konto.
2. **Warten/Prüfen:** Animation (Abschnitt 9). Seite aktualisiert sich selbst, kein „Ergebnis prüfen“-Button.
3. **Ergebnis:** Score-Ring + Headline + Prüfpunkte zum Aufklappen. Bei Problemen „So behebst du das“.
4. **Anleitung:** „Wo liegt deine Domain?“ (Anbieter-Chips) → nummerierte Schritte → DNS-Wert kopieren → „Erneut testen“.
5. **Teilen:** Link für den Kunden.

| Prüfpunkt (Klartext) | Technik | Beispiel Klartext bei Fehler |
|---|---|---|
| Absender bestätigt | SPF | Deine Domain sagt nicht, welche Server Mails für sie senden dürfen. |
| Mail unterschrieben | DKIM | Deine Mail hat keine digitale Unterschrift. |
| Schutzregel | DMARC | Es gibt keine Regel, was mit gefälschten Mails in deinem Namen passieren soll. |
| Server-Ruf | Sperrlisten, rDNS | Dein Server steht auf einer Sperrliste. |
| Inhalt | Spamfilter-Score | Betreff nur in Großbuchstaben wirkt verdächtig. |

Fachbegriff immer klein unter dem Klartext, Rohdaten für Profis ganz unten aufklappbar.

---

## 6. Datenschutz (nicht verhandelbar)

- Hosting ausschließlich in Deutschland.
- Mail-Inhalt nur im Speicher auswerten und **direkt danach löschen**.
- Gespeichert wird nur die Ergebnis-Zusammenfassung (Score, Prüfpunkte), automatische Löschung nach 7 Tagen.
- Ergebnis-Links nur mit zufälliger ID erreichbar, `noindex`, nicht in der Sitemap.
- Kein Google Analytics, keine Tracking-Cookies im MVP → kein Cookie-Banner nötig.
- Fonts lokal einbinden (kein Laden von Google-Servern zur Laufzeit).
- AVV-Vorlage für Agenturen.

---

## 7. SEO und Inhalte

**Seitenstruktur (Hub-and-Spoke, Vorbild flinkform.de):**
- `/` Startseite: Tool zuerst und allein im sichtbaren Bereich, darunter FAQ und Ratgeber-Teaser.
- `/dmarc-check`, `/spf-check`, `/dkim-check`: eigene Tool-Seiten (DNS-Schnellcheck, DKIM auch ohne Selektor).
- `/anleitung/<anbieter>/<thema>`: z. B. `/anleitung/ionos/dmarc`.
- `/wissen/<begriff>`: z. B. „Was ist DKIM?“.

**Anbieter zum Launch:** IONOS, Strato, All-Inkl, Hetzner, Google Workspace, Microsoft 365. AT/CH-Hoster später.

**Inhalte:** 26 Seiten zum Launch (Liste: `research/seo-strategie.md`, Hetzner als Sammelseite `/anleitung/hetzner/spf-dkim-dmarc`, Text-Regeln: `docs/content-briefing.md`). KI schreibt, Fachleute prüfen jede Anleitung vor Veröffentlichung gegen die echte Oberfläche des Anbieters.

**Technik-SEO:** statisch und schnell, saubere Überschriften, FAQ mit echten Suchfragen (gern mit FAQ-Schema), interne Links von jeder Anleitung aufs Tool, Sitemap, Google Search Console ab Tag 1.

**Keyword-Daten (Seobility, Google.de, Okt. 2026):**

| Suchbegriff | Volumen/Monat | CPC |
|---|---|---|
| e mail check | 4.400 | 3,27 € |
| mail tester | 3.600 | 5,15 € |
| dmarc check | 2.400 | 0,22 € |
| e mail spam check | 1.600 | 2,18 € |
| e mail tester | 1.000 | 0,84 € |

Backlinks: zuerst eigene Seiten (dennisbuchwald.de, flinkform.de), dann Tool-Verzeichnisse und Webdesigner-Communities.

---

## 8. Technik (entschieden 21.10.2026, Details in `docs/PLAN.md`)

- **Website:** Astro, statisch, Tool als kleine Insel in Vanilla TS. Ratgeber als Content-Collections mit Frontmatter `quelle`, `stand`, `geprueft`.
- **Engine:** Node 24 + TypeScript (läuft ohne Build per Type-Stripping), Hono für die API, `mailauth` für SPF/DKIM/DMARC inkl. Alignment.
- **Mail-Empfang:** eigener SMTP-Empfang in Node (`smtp-server`) statt Postfix, weil Postfix Mails auf die Platte schreibt. Mail liegt nur im RAM, unbekannte Adressen werden beim `RCPT TO` abgelehnt.
- **Testadressen:** `<8 Zeichen>@test.e-mail-check.de`, 60 Minuten gültig, nur eine Mail pro Adresse.
- **Inhalt:** rspamd per HTTP, nur Inhalts-Regeln (Auth, IP-Listen, Bayes, Fuzzy aus).
- **DNS:** eigener Resolver unbound im Stack, weil Spamhaus öffentliche Resolver blockt.
- **Fortschritt:** Server-Sent Events, Polling als Fallback.
- **Datenbank:** SQLite (`node:sqlite`), nur Testadressen und Ergebnis-Zusammenfassungen, Löschjob stündlich.
- **Statistik:** Umami (selbst gehostet, lokal aus).
- **Score:** `docs/scoring.md`.
- **Start lokal:** `docker compose up --build`.

**Infrastruktur:**
- Entwicklung **lokal** (ca. 90 %): UI, API, DNS-Checks, rspamd in Docker mit Beispiel-Mails (.eml).
- Echter Mail-Empfang braucht öffentliche IP + eingehenden Port 25 → Server.
- Übergangsweise auf Dennis' bestehendem Hetzner-Server (CAX11, ARM, 2 vCPU, 4 GB, Nürnberg, dort läuft n8n). Sauber in Docker isolieren, n8n nicht beeinträchtigen.
- Später eigener Server (Ziel: kleinster passender Hetzner-Cloud-Server in DE, hochskalierbar). Grund: Der Dienst nimmt Mails von Fremden an → Isolation von n8n.

---

## 9. Design

> **Stand 21.10.2026: Design abgeschlossen (V2).** Grundlage: `REDESIGN-V2-PROMPT.md`, Prototyp `design/redesign/hero-animation-prototyp.html`, ältere Aufträge in `docs/prompts-archiv/`. Tokens: `apps/web/src/styles/global.css`. Screenshots: `docs/redesign/` (V1) und `docs/redesign/v2/` (vorher/nachher). Neue Design-Ideen nur noch als Vorschlag in `docs/STATUS.md`, nicht als Umbau.

**Grundhaltung:** UX radikal einfach (Vorbild Trade Republic: Komplexes simpel darstellen), Look wie ein hochwertiges SaaS-Produkt mit eigener Identität.

**Farben: Schwarz-Weiß, keine Akzentfarbe.** Farbe ausschließlich für den Status.

| Rolle | Wert |
|---|---|
| Tinte (Text, gefüllte Buttons) | `#111113` |
| Fließtext gedeckt | `#4A4B50` / `#6B6C72` |
| Kartenrand | `#E7E7EB` |
| Trennlinien | `#EEEEF1` |
| Felder (Testadresse, Mini-Tabellen) | `#F6F6F7` |
| Sektion-Hintergrund (soft) | `#FAFAFB` |
| Karten | `#FFFFFF` |
| Status OK / Hinweis / Problem | `#02CA50` / `#FF8A00` / `#FF4034` (Rot bedeutet immer „Problem“) |
| Status-Tönungen (Pill-Grund) | `#E3F8EC` / `#FFF1E0` / `#FFE9E7` |

**Regel für Statusfarben:** Volle Statusfarbe nur als **Fläche** (Punkte, Balken, Skala). Status-Labels = Pill mit Tönung als Grund und Tinte-Schrift. Nie als Schriftfarbe auf Weiß.

**Logo:** Wortmarke „mail / check“ (zweizeilig, Fraunces 700 als Pfade, Bildmarke rechtsbündig auf der „mail“-Zeile, `brand/wortmarke.svg` und `wortmarke-weiss.svg`). Im Code als `components/Wordmark.astro` inline, aufgeteilt in `.wm-text`, `.mark-grow`, `.badge-load`, `.ko-load`, `.check-load`, Masken-ID pro Einsatz eindeutig. Unter 32 px Höhe nur die Bildmarke (massiver Brief mit grünem Prüf-Kreis `#02CA50`). Favicons und App-Icons in `brand/`. Der Domainname bleibt Text (Title, Impressum), es gibt keinen Schriftzug „e-mail-check.de“ mehr.

**Typografie:** Überschriften **Fraunces** (680, `'SOFT' 0, 'WONK' 0`, eng `-0.025em`, `text-wrap: balance`). Fließtext **Inter**. Technische Werte und Eyebrows in **IBM Plex Mono** (Eyebrow: 12 px, Versalien, Laufweite `.12em`). Alles lokal.

**Formen:**
- Karten: 1 px Rand `#E7E7EB`, Radius 20 px, weicher Schatten.
- Buttons: Radius 14 px, 52 px hoch, gefüllt Tinte oder 1-px-Outline.
- Touch-Ziele ≥ 44 px, Kontrast ≥ 4,5:1, echte Buttons/Links.

**Statusleiste (alle Seiten, `layouts/Base.astro`):** `sticky`, 76 px hoch, kein Kasten. Der Hintergrund läuft über die volle Breite, der Inhalt sitzt auf der Inhaltsbreite der Seite (`.wrap`, 1200 px, Rand wie der Rest der Seite; Dennis' Wunsch 21.10.2026 statt 40 px vom Fensterrand). Oben transparent, beim Scrollen Weiß 86 % mit 1-px-Linie `#EDEDF0`. Links die Wortmarke (52 px, mobil 40 px, Link auf `/`, `aria-label` „mail check, Startseite“). Mitte die Mono-Pille „System bereit · Server DE · X Tests heute“ (mobil nur „Bereit“). Rechts nur „Ratgeber ▾“, ein Tastatur-Menü (Enter, Pfeiltasten, Esc) mit Anleitungen, Wissen und Schnell-Checks. **X ist immer echt:** fertige Tests seit 0 Uhr Europe/Berlin aus der Datenbank (`GET /api/stats`, 60 s Cache, rate-limitiert, keine personenbezogenen Daten). Unter 50 entfällt das Segment, nie eine erfundene Zahl.

**Hero der Startseite (`components/Tool.astro`):** `min-height` volle Höhe abzüglich Leiste, Inhalt 56 px unter der Leiste. Hintergrund Punktraster (`radial-gradient(#CFCFD6 1px, transparent 1.2px)`, 22 px, radiale Maske `ellipse 60% 55% at 50% 42%`). H1 68 px (mobil 40 px) plus ein Satz. Darunter das **Mail-Fenster** (Card, Radius 18 px): Kopf „Neue Nachricht“ / „Testmail“, Zeile „An“ mit Testadresse (Mono 21 px, mobil zwei Zeilen fest am @ umbrochen) und „Kopieren“ („Kopiert ✓“), Zeile „Betreff: Egal. Am besten so, wie du sonst schreibst.“, Fuß mit pulsierendem Punkt „Wir warten auf deine Mail.“ und „Mail ist raus →“ (mobil zusätzlich „Mail-Programm öffnen“). Vertrauenszeile mit grünen 18-px-Kreisen und Ink-Häkchen. Unten „So funktioniert's ⌄“. **Ein** dezenter grüner Schein liegt hinter dem Mail-Fenster (unter der Card, über dem Raster; 760 × 300 px, mobil 420 × 220; `radial-gradient(closest-side, rgba(2,202,80,.14), transparent)`, `blur(30px)`). In Ruhe steht er still, im Prüf-Modus atmet er (opacity 0,7 → 1, scale 0,96 → 1,04, 2,4 s), am Ende nimmt er kurz die Ergebnisfarbe an und blendet über 1,5 s aus. Reduced Motion: statisch. Er ist kein Ersatz für die V1-Aura, die bleibt weg.

**Animationen: keine Bibliothek.** Kein GSAP, kein Framer Motion, kein Lottie. CSS-Keyframes und Transitions, scroll-gebunden per `animation-timeline: scroll()` mit kleinem JS-Fallback (passiver Scroll-Listener plus rAF), Count-up als eigener rAF-Loop. Nur `transform`/`opacity`, keine Layout-Animationen, CLS 0, `prefers-reduced-motion` immer beachten. GSAP erst prüfen, wenn eine Timeline-Choreografie kommt, die CSS nicht sauber schafft, und dann vorher mit Dennis abstimmen.
- **A, Laden:** Prüf-Punkt und Knockout-Ring fehlen anfangs, ab 450 ms skalieren sie 0 → 1,15 → 1 (550 ms, `cubic-bezier(.34,1.56,.64,1)`), ab 850 ms zeichnet sich das Häkchen (350 ms). Jeder Seitenaufruf, nicht bei Reduced Motion.
- **B, Scrollen (nur in der Fläche der Wortmarke):** 0–90 px Text blendet aus und gleitet 60 px nach links, 20–160 px wächst die Bildmarke auf das 3-Fache, 60–160 px bekommt die Leiste Hintergrund und Linie, rückwärts beim Hochscrollen. Ohne Scroll-Timelines (Firefox) oder mit Reduced Motion setzt JS ab 80 px `.is-compact` (300-ms-Transition bzw. harter Wechsel).
- **Falle:** Der CSS-Minifier (lightningcss) faltet `animation-timeline` in die `animation`-Kurzschreibweise, dort ist sie ungültig. Deshalb stehen Timeline und Range in einem eigenen Selektor (`g.wm-text` neben `.wm-text`). Skripte werden nie inline gebaut (`assetsInlineLimit: 0`), weil die CSP nur `script-src 'self'` erlaubt.

**Ergebnis-Seite:** Mail-Kopf (Absender, Betreff, Zeit) → Urteil als Headline → Score mit Band (Hohes Risiko / Gefährdet / Solide / Sehr gut) und Teil-Scores (Authentifizierung, Server-Ruf, Inhalt) → Ausnahme-Karte bei SPF/DKIM/DMARC-Fehler → Aktionsplan (Wirkung + „+X Pkt.“ pro Behebung, größte zuerst) → bestandene Prüfungen → Teilen, erneut testen, technische Details. Regeln dazu: `docs/scoring.md`.

**Prüf-Animation (wichtig, soll richtig befriedigend sein):**
1. Warten: Ring mit kreisendem Punkt, gestrichelter Innenring dreht gegenläufig, Briefumschlag in der Mitte.
2. Mail empfangen: Umschlag „ploppt“ mit Häkchen auf (Bounce).
3. Prüfen: Scan-Strahl fährt über die Mail, Fortschrittsring füllt sich pro Check, Checkliste hakt nacheinander ab, pulsierende Punkte („Check 3 von 6“).
4. Fertig: Ring federt, Funken-Burst, dann Ergebnis.
Die Animation folgt dem echten Fortschritt der Analyse (Events aus der API), nicht nur einem Timer.

**Checkliste im Prüf-Modus (Vorbild: Aufgabenliste von Claude):** Jeder Prüfschritt hat drei Zustände:
- **offen:** gestrichelter Kreis (`2px dashed #B8B8BE`), Text gedeckt
- **läuft:** drehender Ring, Text fett, darunter eine Live-Zeile in IBM Plex Mono, was gerade passiert (z. B. „Suche den SPF-Eintrag deiner Domain …“, „Frage 12 Sperrlisten ab …“). Möglichst echte Details aus der API (Domain, Anzahl Listen).
- **erledigt:** gefüllter Tinte-Kreis mit weißem Haken, ploppt mit Bounce auf
Dazu oben eine Statuszeile mit pulsierenden Punkten („Check 3 von 6“).

**Befriedigung ist ein Kernziel der UX.** Das Ergebnis soll sich „aufbauen“, nicht einfach erscheinen:
- **Score zählt hoch:** Zahl läuft in ca. 1,2 s von 0 auf den Endwert (ease-out), der Ring füllt sich synchron (conic-gradient in Statusfarbe auf `#F0F0F2`).
- **Prüfpunkte federn nacheinander ein** (Bounce-Kurve, ca. 90 ms Versatz), erst nachdem der Score steht.
- **Haptik auf Mobilgeräten:** kurzes `navigator.vibrate(10)` pro erledigtem Check, kleines Doppel-Muster wenn das Ergebnis steht. Fehlertolerant (nicht jedes Gerät unterstützt es).
- **Fertig-Moment:** Ring federt, Funken-Burst.
- Alles respektiert `prefers-reduced-motion` (dann ohne Bewegung, Ergebnis sofort, keine Vibration).
- Optional später: dezenter Sound beim Ergebnis, standardmäßig aus.

---

## 10. Später (nicht MVP)

PDF-Kundenbericht · Konto mit Verlauf · Test-Pakete/Agentur-Tarif · DMARC-Monitoring als Abo · Werbung ab ~10.000 Besuchern/Monat (nur Ratgeber-Seiten und unter dem Ergebnis, nie im Test-Ablauf) · White-Label · API · weitere Anbieter (Netcup, Hostinger, AT/CH) · Überwachung via n8n.

## 11. Referenzen

- Repository: https://github.com/dennisbuchwald/e-mail-check.de (**öffentlich**, `main`, Deploy per `scripts/deploy.sh`, Ablauf in `docs/DEPLOYMENT.md`). Code AGPL-3.0, Texte/Logo/Design geschützt (`LICENSE-CONTENT.md`). `research/`, `docs/recht-notizen.md`, `docs/offene-punkte.md` bleiben lokal und kommen nie ins Repo.

- Start-Auftrag für den Agenten: `START-PROMPT.md`
- Design-Quelltext, Tokens: `design/` · Logo: `brand/`

- Konzept-Dokument (Hintergrund, teils älterer Stand – diese Datei hat Vorrang): https://claude.ai/code/artifact/cca40c3b-2047-4a93-a95f-41524bf8d5d3
- Vorbild Funktion: https://mail-tester.com
- Vorbild SEO-Aufbau: https://flinkform.de
- Design-Grundlage: dbw-media-Styleguide (`05_Second-Brain/design-system.md`)

