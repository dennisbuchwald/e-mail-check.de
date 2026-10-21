# Status

Stand: 21.10.2026

## Steht (lokal komplett lauffähig: `docker compose up -d --build`)
- **Engine** (`apps/engine`): SMTP-Empfang nur im RAM, SPF/DKIM/DMARC mit Alignment, rDNS, 5 Sperrlisten über eigenen Resolver, Inhalt per rspamd, Score + Klartext, API mit SSE, DNS-Schnellcheck mit Versender-Erkennung, Rate-Limit, Löschung nach 7 Tagen. 95 Tests grün.
- **Website** (`apps/web`): Startseite mit Tool und Prüf-Animation an echten Events, Ergebnis mit Prüfpunkten, Anleitung im Ergebnis (Anbieter wird erkannt), Teilen-Link `/ergebnis/<id>` (noindex), DNS-Checks `/spf-check`, `/dkim-check`, `/dmarc-check`.
- **Redesign 21.10.2026** (`REDESIGN-PROMPT.md`): cleaner SaaS-Stil, Hero mit Aura, Sektionen „Was wir prüfen“ und „Was bedeutet die Zahl?“, neue Ergebnis-Seite mit Mail-Kopf, Bändern, Teil-Scores, Ausnahme-Karte und Aktionsplan (+X Pkt. pro Behebung). Betreff und Absender bleiben nur 60 Min im RAM. Vorher/Nachher: `docs/redesign/`. E2E 8/8 grün.
- **Warte-Erlebnis (21.10.2026):** „Mail-Programm öffnen“ (mailto), Radar-Sweep mit Uhr „Postfach offen seit“, wechselnde Tipps, Hilfe nach 45 s, Brief fliegt in den Ring, Absender/Betreff erscheinen, fünf Lämpchen am Ring in Ergebnisfarbe, Live-Zeilen mit echten Werten (SSE `step` trägt `status`, `detail`, bei `received` `mail`).
- **Redesign V2 abgeschlossen (21.10.2026, nicht deployt):** Statusleiste mit Wortmarke „mail / check“, Pille mit echtem Zähler (`GET /api/stats`, ab 50 sichtbar) und Tastatur-Menü „Ratgeber“; Hero mit Mail-Fenster auf Punktraster, Aura entfernt; Animation A (Prüf-Punkt springt beim Laden ins Logo) und B (Wortmarke wird beim Scrollen zum Logo, Fallback `.is-compact` für Firefox und Reduced Motion), alles ohne Animationsbibliothek; Footer-Wortmarke, neues OG-Bild. Lighthouse mobil Startseite 98/100/100/100, CLS 0. Screenshots `docs/redesign/v2/`. Damit ist das Design fertig, neue Ideen nur als Vorschlag hier.
- **Ergebnis V2 (21.10.2026):** Zustellweg mit sechs Stationen und Messgrafiken, serverseitig gerendert (Caddy-Templates), neue Checks: Freemail (−0,2), Transport/TLS und Zustellkette, 10 freie Sperrlisten plus DNSWL und Mailspike als Positivlisten, HELO-Abgleich, Inhalts-Hinweise (Bild/Text, Textfassung, kurze Mail), Newsletter-Erkennung erweitert, rspamd-Regeln einzeln auf Deutsch. **Link-Abruf entfernt** (Links werden nie aufgerufen, vorher HEAD/GET auf tote Links). „Mail-Quelle & Header“ mit Text, HTML (Sandbox) und Header nur live, nichts gespeichert. Screenshots `docs/redesign/ergebnis-v2/`. A11y 100, CLS 0.
- **Startseite „Der Weg deiner Mail“ (21.10.2026, nicht deployt):** sechs Stationen mit hairline-Figuren (17,7 kB gzip, lädt erst beim Reinscrollen) statt „Was wir prüfen“, Verbindungslinie füllt sich grün, Drei-Schritte-Zeile mit „Jetzt testen ↑“; Figuren auch im Ratgeber-Kopf, auf der 404 und beim abgelaufenen Ergebnis-Link. Lighthouse mobil Startseite 96/100/100/100, CLS 0. Bewusst nicht: `dish` im Warte-Modus (dort laufen schon Ring, Radar und Uhr, eine weitere bewegte Figur wäre unruhig) und die eigene Figur per hairline-Skill (optional; Werkzeug aus dem Netz in die Agent-Umgebung, ohne Freigabe nicht installiert). Screenshots `docs/redesign/startseite-weg/`.
- **Inhalte**: 27 Seiten (4 Tools, 5 Wissen, 16 Anleitungen, Übersicht, Vergleich `/mail-tester-alternative`), alle mit Quelle und Stand, Anleitungen mit `geprueft: false`.
- **Technik-SEO**: Titles/Descriptions, Canonicals, strukturierte Daten, Sitemap, robots.txt, OG-Bild, 404. Lighthouse mobil ≥ 95 in allen Kategorien.
- **Recht**: Impressum (Platzhalter), Datenschutz + AVV als Entwurf (noindex).
- **Statistik**: Umami als Compose-Profil vorbereitet, lokal aus.
- **E2E**: 8 Playwright-Tests grün (Desktop + Mobil).
- **Doku**: README, `docs/scoring.md`, `docs/DEPLOYMENT.md`, `docs/offene-punkte.md`, `research/abschluss-audit.md`.

## Live
- https://e-mail-check.de ist öffentlich live (Hetzner CAX11), Mail-Empfang auf `*@test.e-mail-check.de` mit STARTTLS, PTR gesetzt. Details: `docs/DEPLOYMENT.md`.

## Fehlt bis zum Launch
1. Impressum-Daten eintragen (Dennis).
2. Datenschutz + AVV rechtlich prüfen lassen.
3. 56 offene Punkte der Anleitungen gegen die echten Oberflächen prüfen (`docs/offene-punkte.md`).
4. Search Console einrichten, Sitemap einreichen.

## Offene Fragen an Dennis
- Wer prüft die Anleitungen fachlich gegen die Anbieter-Oberflächen?
- SPF-Linie für Domains mit Google und Microsoft: `~all` oder `-all`?

## Ideen für später (nicht gebaut)

Suchvolumen: Seobility, Google.de, Monat, Stand 21.10.2026.

| Idee | Suchbegriffe (Volumen) | Aufwand | Einschätzung |
|---|---|---|---|
| Sperrlisten-Check als eigene Seite (IP/Domain eingeben) | blacklist check 1.300, blacklist test 1.000, blacklist email test 880, blacklist check ip 720, mail blacklist test 480 | klein: Abfrage gibt es schon in der Engine | **zuerst**: viel Volumen, kaum Wettbewerb auf Deutsch |
| Header-Analyzer (Kopfzeilen einfügen, Weg der Mail + Auth-Ergebnis) | mail header analyse 1.000, email header analyzer 880, email header analysieren 170 | mittel: Parser für Received-Ketten, Datenschutz-Text (nur im Browser auswerten wäre am saubersten) | **zweitens** |
| DKIM-Check mit Selektor ausbauen | dkim check 4.400 (Seite `/dkim-check` gibt es) | klein: Schlüssellänge, Algorithmus, häufige Selektoren je Anbieter | Seite optimieren statt neu bauen |
| DMARC-Generator (Regel zusammenklicken, Wert kopieren) | dmarc generator 720 | klein: reines Frontend | passt gut zu `/dmarc-check`, guter interner Link |
| BIMI-Check | bimi check 90 | klein bis mittel (SVG-Tiny-PS + VMC prüfen) | kaum Volumen, später |
| Wiederkehrender Test / Monitoring | kaum Suchvolumen, eher Bindung und späteres Geld | groß: Konten, Mails, Zeitplan | erst nach Traffic (siehe CLAUDE.md §10) |

## Redesign V2: Abweichungen vom Auftrag (mit Grund)

| Abweichung | Grund |
|---|---|
| Mobil zusätzlich „Mail-Programm öffnen“ im Mail-Fenster | Kommt aus dem Warte-Paket A (von dir gewünscht). Auf dem Handy ist Kopieren umständlich, auf dem Desktop bleibt das Fenster 1:1 wie im Prototyp. |
| Kein „Neuer Test“-Knopf mehr in der Leiste | Auftrag sagt rechts nur „Ratgeber“. Neuer Test geht weiter über „‹ Neuer Test“ im Ergebnis und über die Hinweisseiten; im Warte-Modus nur per Neuladen. |
| Pill-Text „Mail-Test · unbegrenzt kostenlos · ohne Konto“ über der H1 entfernt | Steht so nicht im Prototyp. „Unbegrenzt kostenlos“ bleibt in FAQ und Inhalten. |
| Ratgeber-Menü in drei Gruppen (Anleitungen, Wissen, Schnell-Checks) | Der Auftrag nennt nur „Ratgeber- und Anleitungsseiten“; die DNS-Checks sind die meistgesuchten Unterseiten. |
| Zähler zusätzlich 60 s im Browser gecacht, Endpoint 600 Abrufe/h je IP | Sonst fragt jeder Seitenaufruf die API ab. Der Server cacht ebenfalls 60 s. |
| OG-Bild mit Unterzeile „Kostenloser Mail-Tester · Server in Deutschland“ | Ohne sie ist in Vorschauen nicht erkennbar, was das Tool tut. |

Nebenbei behoben: `apps/web/src/data/` war wegen der Regel `data/` nie im öffentlichen Repo (frischer Klon hätte nicht gebaut); der CSS-Minifier hat `animation-timeline` ungültig zusammengefasst; kleine Skripte wurden inline gebaut und von der CSP blockiert.

## Ergebnis V2: offen bei Dennis

- **Spamhaus:** frei nur nicht-kommerziell. Vor Werbung oder bezahlten Paketen eine bezahlte DQS nötig; besser jetzt den kostenlosen DQS-Schlüssel beantragen und Spamhaus schriftlich fragen, ob ein öffentlicher Mail-Tester abgedeckt ist.
- **Barracuda** (Resolver-IP 167.235.225.13 kostenlos registrieren) und **SpamRATS** (kostenloser API-Schlüssel) wären sinnvolle Ergänzungen. Beides braucht ein Konto, deshalb nicht eingebaut.
- Datenschutzerklärung an die neuen Punkte angepasst (Zustellkette, Vorschau nur live, Links nie aufgerufen, Listenbetreiber). Bei der rechtlichen Prüfung mit ansehen.
