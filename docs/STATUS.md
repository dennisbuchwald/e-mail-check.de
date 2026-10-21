# Status

Stand: 21.10.2026

## Steht (lokal komplett lauffähig: `docker compose up -d --build`)
- **Engine** (`apps/engine`): SMTP-Empfang nur im RAM, SPF/DKIM/DMARC mit Alignment, rDNS, 5 Sperrlisten über eigenen Resolver, Inhalt per rspamd, Score + Klartext, API mit SSE, DNS-Schnellcheck mit Versender-Erkennung, Rate-Limit, Löschung nach 7 Tagen. 35 Tests grün.
- **Website** (`apps/web`): Startseite mit Tool und Prüf-Animation an echten Events, Ergebnis mit Prüfpunkten, Anleitung im Ergebnis (Anbieter wird erkannt), Teilen-Link `/ergebnis/<id>` (noindex), DNS-Checks `/spf-check`, `/dkim-check`, `/dmarc-check`.
- **Inhalte**: 26 Seiten laut `research/seo-strategie.md` (4 Tools, 5 Wissen, 16 Anleitungen, Übersicht), alle mit Quelle, Stand, `geprueft: false`.
- **Technik-SEO**: Titles/Descriptions, Canonicals, strukturierte Daten, Sitemap, robots.txt, OG-Bild, 404. Lighthouse mobil ≥ 95 in allen Kategorien.
- **Recht**: Impressum (Platzhalter), Datenschutz + AVV als Entwurf (noindex).
- **Statistik**: Umami als Compose-Profil vorbereitet, lokal aus.
- **E2E**: 8 Playwright-Tests grün (Desktop + Mobil).
- **Doku**: README, `docs/scoring.md`, `docs/DEPLOYMENT.md`, `docs/offene-punkte.md`, `research/abschluss-audit.md`.

## Live (Vorschau)
- https://e-mail-check.de läuft auf Hetzner CAX11 hinter Passwortschutz, Mail-Empfang auf `*@test.e-mail-check.de` mit STARTTLS, PTR gesetzt. Details: `docs/DEPLOYMENT.md`.

## Fehlt bis zum Launch
1. Impressum-Daten eintragen (Dennis).
2. Datenschutz + AVV rechtlich prüfen lassen.
3. 56 offene Punkte der Anleitungen gegen die echten Oberflächen prüfen (`docs/offene-punkte.md`).
4. Go-live-Schritte in `docs/DEPLOYMENT.md` (Passwortschutz raus).

## Offene Fragen an Dennis
- Wer prüft die Anleitungen fachlich gegen die Anbieter-Oberflächen?
- SPF-Linie für Domains mit Google und Microsoft: `~all` oder `-all`?
