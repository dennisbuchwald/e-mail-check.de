# Status

Stand: 21.10.2026

## Steht
- Phase 0: Plan + Stack freigegeben (`docs/PLAN.md`)
- Phase 2 Engine (`apps/engine`):
  - SMTP-Empfang nur für gültige Testadressen, Mail nur im RAM
  - Prüfungen SPF, DKIM, DMARC (Alignment), rDNS, 5 Sperrlisten, Inhalt (rspamd)
  - Score + Ampel + Klartext (`docs/scoring.md`)
  - API: Testadresse, Status, SSE-Fortschritt, Ergebnis (7 Tage, noindex), DNS-Schnellcheck, Rate-Limit
  - 35 Tests grün (Fixtures `.eml` mit simuliertem DNS, SMTP-Integration, API, Ablauf/Löschung)
  - Docker: engine, rspamd 4.2, unbound (eigener Resolver) laufen, Spamhaus-Abfragen funktionieren

## Läuft gerade
- Phase 1 Research (Hintergrund): Ergebnisse kommen nach `research/`

## Als Nächstes
- Phase 3 Website (Astro + Tool-Insel + Prüf-Animation)
- Stopp-Punkt: `research/seo-strategie.md` an Dennis, dann Phase 4 Inhalte

## Offene Fragen
- keine
