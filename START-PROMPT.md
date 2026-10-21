# Start-Prompt für Claude Code: e-mail-check.de

> So startest du: Claude Code in diesem Ordner öffnen und den Block unten (alles zwischen den Linien) als erste Nachricht einfügen. Claude in Chrome sollte verbunden sein, in Seobility bist du eingeloggt.

---

Du baust **e-mail-check.de** vollständig und eigenständig: Website, Software und SEO. Ziel ist die beste deutschsprachige Website für „E-Mail-Check / Mail-Tester“, nicht nur ein funktionierendes MVP. Am Ende steht eine **lokal komplett lauffähige** Website inklusive Mail-Test, DNS-Check, aller Ratgeber-Seiten und aller SEO-Berichte.

## 1. Zuerst lesen
1. `CLAUDE.md`: Produkt, MVP-Umfang, Datenschutz, SEO-Struktur, Design. **Das ist verbindlich.**
2. `design/`: Prototyp-Quelltext (Screens + Prüf-Animation), `design-tokens.json`, Link zum klickbaren Prototyp.
3. `brand/`: fertiges Logo, Favicons, App-Icons.

## 2. Arbeitsweise
- Arbeite **autonom** und in Phasen. Frag mich nur an den unten markierten **Stopp-Punkten** oder bei echten Produkt-/Rechtsentscheidungen. Technische Details entscheidest du selbst und begründest sie kurz.
- Stell Rückfragen gebündelt: wenige, konkrete Fragen mit deiner Empfehlung.
- Halte eine Aufgabenliste aktuell, mach kleine, sinnvolle Git-Commits (Repo initialisieren, falls nötig).
- Pflege `docs/STATUS.md` laufend: Was steht, was fehlt, nächste Schritte, offene Fragen.
- Aktualisiere `CLAUDE.md`, wenn sich Entscheidungen ändern.
- **Nie** ohne meine Freigabe: auf einen Server deployen, etwas auf meinem Hetzner-/n8n-Server ändern, Domains/DNS anfassen, etwas kaufen oder Konten anlegen.
- Erfinde keine Fakten. Impressum-Daten, rechtliche Texte und Anbieter-Anleitungen nie raten: Platzhalter setzen oder mich fragen.

## 3. Phasen

### Phase 0: Plan und Stack (Stopp-Punkt)
- Bewerte den empfohlenen Stack aus `CLAUDE.md` Abschnitt 8 kritisch (Astro vs. Next.js, Node vs. Python für die Analyse, Polling vs. Server-Sent Events, Postfix + rspamd, Datenbank).
- Leg mir einen kurzen Plan vor: Architektur (Diagramm als Text), Stack mit Begründung, Ordnerstruktur, Phasen mit Meilensteinen.
- **Warte auf mein OK**, bevor du Code schreibst.

### Phase 1: SEO- und Markt-Research
Nutze **Claude in Chrome** (meine echten Logins) und Websuche:
- **Seobility** (eingeloggt, Keyword-Recherche Google.de; Tageslimit ca. 100 Checks, sparsam nutzen): Keywords rund um E-Mail-Check, Mail-Tester, Spam-Test, SPF/DKIM/DMARC prüfen/einrichten, plus Anbieter-Kombinationen (z. B. „dmarc ionos“, „spf eintrag strato“). Suchvolumen, CPC, Intention, Wettbewerb.
- **Google** (SERP-Analyse): Wer rankt für die Top-15-Keywords? Inhalte, Länge, Struktur, FAQ, „Nutzer fragen auch“, Featured Snippets, Lücken.
- **Google Trends** (DE, 5 Jahre): Entwicklung SPF/DKIM/DMARC/Mail-Tester, Saisonalität, Treiber (z. B. Gmail/Microsoft-Anforderungen).
- **Wettbewerber im Detail:** mail-tester.com, CaptainDNS, MXToolbox, Ratgeber deutscher Hoster. Was machen sie gut, wo sind sie schwach (Sprache, Verständlichkeit, Datenschutz, Anleitungen)?
- **Anbieter-Recherche:** Für IONOS, Strato, All-Inkl, Hetzner, Google Workspace, Microsoft 365 die offiziellen Hilfeseiten zu SPF, DKIM, DMARC finden (Menüpfade, Besonderheiten). Quellen immer mit URL notieren.

**Ablage** in `research/`:
- `keyword-map.csv` (Keyword, Volumen, CPC, Intention, Wettbewerb, Zielseite)
- `serp-analyse.md`, `wettbewerb.md`, `trends.md`
- `anbieter-quellen.md` (pro Anbieter und Thema: offizielle Quelle, Kernschritte, Stand-Datum)
- `seo-strategie.md`: finale Seitenliste (mind. die ~20 Launch-Seiten), Keyword-Zuordnung (ein Haupt-Keyword pro Seite, keine Kannibalisierung), interne Verlinkung, Title/Description-Entwürfe, Content-Briefings pro Seite, Priorität.
- **Stopp-Punkt:** Zeig mir `seo-strategie.md` als Zusammenfassung, bevor du Inhalte schreibst.

### Phase 2: Kern-Software
- **Mail-Pipeline lokal in Docker:** Empfang (z. B. Postfix-Catch-all auf Test-Subdomain), Übergabe an Analyse, sofortiges Löschen des Mail-Inhalts.
- **Prüf-Engine:** SPF, DKIM, DMARC (inkl. Alignment), rDNS/PTR, Sperrlisten, Inhalts-Score (rspamd o. ä.), Ergebnis-Modell mit Score 0–10 (transparente, dokumentierte Gewichtung in `docs/scoring.md`), Klartext-Texte pro Befund.
- **DNS-Schnellcheck** ohne Testmail (Domain eingeben).
- **API:** Testadresse erzeugen, Live-Fortschritt (Events für jeden Prüfschritt, damit die Animation echten Fortschritt zeigt), Ergebnis abrufen, Ergebnis-Link (zufällige ID, 7 Tage, danach automatisch gelöscht), Rate-Limit.
- **Tests:** Unit-Tests für jede Prüfung mit Beispiel-Mails (`.eml`-Fixtures: gut, ohne SPF, ohne DKIM, ohne DMARC, Spam-Inhalt, Sperrliste simuliert). Lokaler End-to-End-Test: Mail per SMTP (z. B. `swaks`) an den lokalen Container schicken → Ergebnis im Browser.

### Phase 3: Website und UX
- Setze das Design aus `design/` und `CLAUDE.md` Abschnitt 9 **exakt** um: Outline-Stil, Schwarz-Weiß, Statusfarben nur als Fläche, Fraunces/Inter/IBM Plex Mono lokal eingebunden, Logo aus `brand/`.
- Screens: Start, Warten + **Prüf-Animation** (an echte API-Events gekoppelt), Ergebnis (Score-Ring, Prüfpunkte aufklappbar, sortiert nach Schwere), Anleitung pro Anbieter (Chips, Schritte, Kopier-Button, „Erneut testen“), teilbarer Ergebnis-Link (`noindex`).
- Mobil zuerst, barrierefrei (Tastatur, Kontraste, echte Buttons, `prefers-reduced-motion` für die Animation).

### Phase 4: Inhalte und Technik-SEO
- Alle Seiten aus `seo-strategie.md` schreiben: Tool-Seiten (`/`, `/dmarc-check`, `/spf-check`), Anleitungen `/anleitung/<anbieter>/<thema>`, Wissen `/wissen/<begriff>`, FAQ.
- Anleitungen nur auf Basis der recherchierten offiziellen Quellen. Jede Anleitung bekommt im Frontmatter `quelle`, `stand` und `geprueft: false`. Fachliche Prüfung macht später ein Mensch.
- Klartext, Du-Ansprache, kurze Absätze, jede Seite verlinkt aufs Tool.
- Technik-SEO: Titles/Descriptions, saubere Überschriften, strukturierte Daten (FAQPage, HowTo wo passend, Organization/WebSite), `sitemap.xml`, `robots.txt`, Canonicals, OG-Bilder, interne Verlinkung, 404-Seite, schnelle Ladezeit (Lighthouse Performance/SEO/Accessibility/Best Practices jeweils ≥ 95, mobil).
- Rechtliches: Impressum (Platzhalter, ich fülle es), Datenschutzerklärung-Entwurf (als Entwurf markiert), AVV-Vorlage-Entwurf. Footer „Ein Projekt von Dennis Buchwald“ → dennisbuchwald.de.
- Cookie-freie Statistik vorbereiten (Umami oder Plausible, selbst gehostet), standardmäßig lokal deaktiviert.

### Phase 5: Qualität und Abschluss
- Alle Tests grün, E2E-Test mit Playwright für den kompletten Ablauf (Start → Mail → Animation → Ergebnis → Anleitung → Teilen).
- Lighthouse-Bericht und kurzer Selbst-Audit gegen `CLAUDE.md` in `research/abschluss-audit.md`.
- Vergleich mit mail-tester.com: Wo sind wir besser, was fehlt noch?
- `README.md`: Lokal starten mit **einem Befehl** (z. B. `docker compose up`), Testmail lokal schicken, Projektstruktur.
- `docs/DEPLOYMENT.md`: Was für den echten Betrieb nötig ist (Server, Port 25, MX-Eintrag für die Test-Subdomain, PTR/rDNS, TLS, Backups, Monitoring), als Checkliste. **Nicht ausführen.**
- Abschluss-Nachricht an mich: Was steht, wie ich es starte, offene Punkte, Empfehlung für die nächsten Schritte.

## 4. Definition of Done
- `docker compose up` startet alles lokal, ich kann im Browser einen Test durchspielen (Testmail lokal einspeisen) und sehe ein echtes Ergebnis mit Animation.
- DNS-Schnellcheck funktioniert für echte Domains.
- Alle Seiten aus der SEO-Strategie sind gebaut, verlinkt und technisch sauber.
- Alle Research-Berichte liegen in `research/`, alle Entscheidungen in `docs/`.
- Datenschutz-Regeln aus `CLAUDE.md` Abschnitt 6 sind nachweislich umgesetzt (Mail-Inhalt nie gespeichert, Ergebnisse nach 7 Tagen weg, Ergebnis-Links `noindex`).

Starte jetzt mit Phase 0.

---
