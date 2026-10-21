# Status

Stand: 21.10.2026

## Steht (lokal komplett lauffähig: `docker compose up -d --build`)
- **Engine** (`apps/engine`): SMTP-Empfang nur im RAM, SPF/DKIM/DMARC mit Alignment, rDNS, 5 Sperrlisten über eigenen Resolver, Inhalt per rspamd, Score + Klartext, API mit SSE, DNS-Schnellcheck mit Versender-Erkennung, Rate-Limit, Löschung nach 7 Tagen. 95 Tests grün.
- **Website** (`apps/web`): Startseite mit Tool und Prüf-Animation an echten Events, Ergebnis mit Prüfpunkten, Anleitung im Ergebnis (Anbieter wird erkannt), Teilen-Link `/ergebnis/<id>` (noindex), DNS-Checks `/spf-check`, `/dkim-check`, `/dmarc-check`.
- **Redesign 21.10.2026** (`REDESIGN-PROMPT.md`): cleaner SaaS-Stil, Hero mit Aura, Sektionen „Was wir prüfen“ und „Was bedeutet die Zahl?“, neue Ergebnis-Seite mit Mail-Kopf, Bändern, Teil-Scores, Ausnahme-Karte und Aktionsplan (+X Pkt. pro Behebung). Betreff und Absender bleiben nur 60 Min im RAM. Vorher/Nachher: `docs/redesign/`. E2E 8/8 grün.
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
