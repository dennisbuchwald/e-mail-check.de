# Plan und Stack (Phase 0)

Stand: 21.10.2026 · Status: **wartet auf Freigabe durch Dennis**

## 1. Architektur

```
                    Internet / lokal
        ┌──────────────────┴───────────────────┐
   Browser (HTTPS :443)                 Absender-Server (SMTP :25)
        │                                       │
   ┌────▼─────┐                        ┌────────▼─────────┐
   │  Caddy   │── /api/* ─────────────►│  engine (Node)   │
   │ statische│                        │                  │
   │ Website  │◄── SSE-Events ─────────│  SMTP-Empfang    │  nimmt NUR gültige
   │ (Astro)  │                        │  (nur RAM)       │  Testadressen an
   └──────────┘                        │       │          │
                                       │  Prüf-Engine     │
                                       │  SPF/DKIM/DMARC ─┼──► unbound (eigener DNS-Resolver,
                                       │  rDNS, Sperrl. ──┼──►  nötig für Sperrlisten)
                                       │  Inhalt ─────────┼──► rspamd (HTTP, speichert nichts)
                                       │       │          │
                                       │  Score 0–10      │
                                       │       │          │
                                       │  SQLite: nur     │  Mail-Inhalt wird nach der
                                       │  Zusammenfassung │  Analyse verworfen, nie auf Platte
                                       │  (7 Tage TTL)    │
                                       └──────────────────┘
   optional: umami (Statistik, lokal aus)
```

## 2. Stack mit Begründung (Abweichungen von CLAUDE.md fett)

| Baustein | Empfehlung | Warum |
|---|---|---|
| Website | **Astro** (statisch) + kleine Tool-Insel in Vanilla TS | 90 % sind Inhaltsseiten → reines HTML, Lighthouse 100 realistisch. Next.js bringt React-Last und Server ohne Mehrwert. Ratgeber als Markdown-Content-Collections mit Frontmatter (`quelle`, `stand`, `geprueft`). |
| API + Analyse | **Node 24 + TypeScript, Hono** | Beste Bibliothek für den Kern ist Node: `mailauth` (vom Nodemailer-Autor) prüft SPF, DKIM, DMARC inkl. Alignment, ARC, BIMI und erlaubt einen eigenen DNS-Resolver → deterministische Tests. Python (checkdmarc, dkimpy) wäre gleichwertig, aber zweite Sprache neben dem Frontend. Hono: klein, schnell, eingebaute SSE-Helfer. |
| Mail-Empfang | **Eigener SMTP-Empfang in Node (`smtp-server`) statt Postfix** | Postfix legt jede Mail in seine Queue = auf die Platte. Das widerspricht „nur im Speicher“. `smtp-server` streamt in den RAM, wir werten aus und verwerfen. Unbekannte Adressen werden schon beim `RCPT TO` abgelehnt (kein Spam-Sammelbecken, kein Backscatter). Liefert Absender-IP + HELO für SPF direkt mit. Lokal: `XCLIENT` erlaubt per `swaks` eine echte Absender-IP zu simulieren. Größenlimit 10 MB. |
| Inhalts-Score | rspamd (offizielles Image, ARM64 vorhanden) | Per HTTP `/checkv2`, JSON-Antwort, schnell. SPF/DKIM/DMARC macht mailauth selbst (transparenter), rspamd liefert nur Inhalts-Symbole. |
| **DNS-Resolver** | **unbound im Stack (neu)** | Spamhaus & Co. blocken Anfragen über öffentliche Resolver (Google, Cloudflare). Ohne eigenen Resolver wären Sperrlisten-Ergebnisse falsch. |
| Live-Fortschritt | **SSE, Polling als Fallback** | Einweg-Events reichen, `EventSource` verbindet sich selbst neu. Gleicher Status-Endpunkt als JSON für Polling. Die Animation zeigt jeden echten Schritt mindestens ~0,5 s, damit sie befriedigend bleibt, auch wenn die Analyse in 1 s fertig ist. |
| Datenbank | SQLite (`node:sqlite`, in Node 24 eingebaut) | Nur Zusammenfassungen, ein Server, stündlicher Lösch-Job (> 7 Tage). Kein extra Dienst. |
| Rate-Limit | im Speicher (pro IP, ~10 Tests/h, DNS-Check ~30/h) | Ein Prozess, kein Redis nötig. |
| Reverse Proxy | Caddy | Liefert die statische Seite, proxyt `/api`, später automatisches TLS. |
| Statistik | Umami (Docker-Profil, lokal aus) | Cookie-frei, deutlich leichter als Plausible (braucht ClickHouse, zu schwer neben n8n auf dem CAX11). |
| Tests | Vitest (Engine, Fixtures `.eml`), Playwright (E2E), Lighthouse CI | |
| Start | `docker compose up` | Eine Zeile, alles da. |

**Score-Transparenz:** Start bei 10, feste Abzüge pro Befund (z. B. kein DMARC −1,5, DKIM fehlt −2, Sperrliste −3, rspamd-Score gestaffelt). Tabelle in `docs/scoring.md`, jeder Abzug steht im Ergebnis bei den Rohdaten. Gleiche Logik wie mail-tester, aber offen dokumentiert.

## 3. Ordnerstruktur

```
apps/
  web/            Astro: Seiten, Tool-Insel, Content (anleitung/, wissen/)
  engine/         Node: smtp/, api/, checks/ (spf, dkim, dmarc, rdns, rbl, content), scoring/, store/
packages/
  shared/         Typen + Klartext-Texte pro Befund (von Engine und Web genutzt)
infra/            docker-compose.yml, Caddyfile, rspamd/, unbound/
tests/e2e/        Playwright
research/         Keyword-Map, SERP, Wettbewerb, Trends, Anbieter-Quellen, SEO-Strategie
docs/             PLAN, STATUS, scoring, DEPLOYMENT
brand/ design/    unverändert
```
pnpm-Workspace (pnpm ist installiert).

## 4. Phasen und Meilensteine

| Phase | Meilenstein | Stopp? |
|---|---|---|
| 0 | Plan freigegeben | ✋ jetzt |
| 1 Research | `research/*` fertig, `seo-strategie.md` | ✋ vor dem Schreiben |
| 2 Engine | `swaks` → lokaler SMTP → Ergebnis-JSON mit Score, Fixture-Tests grün, DNS-Check gegen echte Domains | |
| 3 Website | Start → Animation (echte Events) → Ergebnis → Anleitung → Teilen, im Browser durchspielbar | |
| 4 Inhalte | ~20 Seiten + Technik-SEO, Recht als Platzhalter/Entwurf | |
| 5 Qualität | Playwright grün, Lighthouse ≥ 95, Audit, README, DEPLOYMENT.md | Abschluss |

**Parallelisierung:** Phase 1 (Research über Chrome/Seobility) und Phase 2 (Engine) hängen nicht voneinander ab. Vorschlag: Research läuft in einem Hintergrund-Agenten, während ich die Engine baue. Phase 3/4 starten erst nach deinem OK zur SEO-Strategie.

## 5. Entscheidungen für Dennis

1. **Stack** wie oben (inkl. Node-SMTP statt Postfix, unbound zusätzlich)?
2. **Testadresse:** `k7m2x9qa@test.e-mail-check.de` (Empfehlung: eigene Subdomain, MX getrennt von deinen echten Postfächern, 8 Zeichen gegen Erraten) oder `test-xxxx@e-mail-check.de` wie im Prototyp?
3. **Research parallel zur Engine** starten?

## 6. Für später notiert (keine Entscheidung jetzt)
- Spamhaus erlaubt kostenlose Abfragen nur nicht-kommerziell und bei geringem Volumen. Sobald Werbung läuft: Spamhaus DQS (kostenpflichtig) oder ohne Spamhaus. Im MVP: Spamhaus + freie Listen, in DEPLOYMENT.md vermerkt.
- Echter Betrieb braucht PTR für die Server-IP, sonst lehnen manche Absender die Zustellung ab.
