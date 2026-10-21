# e-mail-check.de

Deutscher, DSGVO-konformer Mail-Tester für Nicht-Techniker: Testmail schicken, in rund 30 Sekunden Score 0 bis 10, Ampel und Klartext-Anleitung für den eigenen Anbieter. Dazu DNS-Schnellchecks für SPF, DKIM und DMARC und 21 Ratgeber-Seiten.

Repository: https://github.com/dennisbuchwald/e-mail-check.de (Branch `main`)

Technik: [docs/scoring.md](docs/scoring.md) (Score) · [docs/datenschutz-technik.md](docs/datenschutz-technik.md) (Datenfluss) · [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) (Betrieb)

## Lokal starten

Voraussetzung: Docker Desktop, Node 24, pnpm.

```bash
docker compose up -d --build
```

Danach:

- Website: http://localhost:8080
- SMTP für Testmails: `localhost:2525`

## Testmail lokal einspeisen

1. http://localhost:8080 öffnen und die Testadresse kopieren.
2. Mail einliefern:

```bash
pnpm send-test <testadresse> deine@domain.de
```

Der dritte Parameter ist optional und setzt die simulierte Absender-IP (Standard: ein Google-Mailserver). Lokal ist dafür `XCLIENT` freigeschaltet, damit SPF und die Sperrlisten mit einer echten IP arbeiten. Im Betrieb ist das aus.

Alternativ mit swaks:

```bash
swaks --server localhost:2525 --to <testadresse> --from du@deine-domain.de --xclient-addr 209.85.220.41
```

Die Seite wechselt von selbst in die Prüf-Animation und zeigt danach das Ergebnis.

## Tests

```bash
pnpm --filter @emc/engine test
```

Das sind 35 Unit- und Integrationstests der Engine. Sie nutzen `.eml`-Fixtures und simuliertes DNS.

```bash
pnpm test:e2e
```

Die 8 Playwright-Tests laufen gegen den laufenden Docker-Stack (Desktop und Mobil) und nutzen dein installiertes Chrome.

## Entwickeln ohne Docker

```bash
pnpm install
pnpm dev:engine
pnpm dev:web
```

- `pnpm dev:engine` startet API und SMTP (:8787, :2525). Ohne rspamd ist der Prüfpunkt „Inhalt“ „nicht geprüft“.
- `pnpm dev:web` startet die Website auf http://localhost:4321. `/api` wird an :8787 weitergeleitet.

Fixtures neu erzeugen:

```bash
node apps/engine/scripts/make-fixtures.ts
```

OG-Bild neu rendern:

```bash
pnpm og-image
```

## Struktur

```
apps/engine/      Node 24 + TypeScript: SMTP-Empfang, Prüfungen, Score, API (Hono), SQLite
  src/checks/     auth (SPF/DKIM/DMARC via mailauth), reputation (rDNS, Sperrlisten), content (rspamd)
  test/           Vitest + .eml-Fixtures
apps/web/         Astro (statisch): Tool-Insel, Check-Seiten, Inhalte
  src/content/    anleitung/, wissen/, seiten/ (Markdown, Schema in content.config.ts)
  src/scripts/    tool.ts (Ablauf + Animation), util.ts
packages/shared/  Typen, Score-Modell (gemeinsam für Engine und Web)
infra/            Caddy, rspamd-Konfiguration, unbound (eigener DNS-Resolver)
tests/e2e/        Playwright
docs/             Score, Datenfluss, Deployment
```

## Statistik (optional)

Umami läuft als Compose-Profil und ist lokal aus:

```bash
docker compose --profile stats up -d
```

Eingebunden wird es erst, wenn beim Web-Build `PUBLIC_UMAMI_ID` gesetzt ist.

## Git & Deployment

- Gearbeitet wird direkt auf `main`, Commits nur unter Dennis' Namen.
- Remote: `origin` → https://github.com/dennisbuchwald/e-mail-check.de.git
- Der Server zieht **nicht** von GitHub: `scripts/deploy.sh` überträgt den lokalen Stand per rsync. So braucht der Server keinen GitHub-Zugang, und nur geprüfte Stände (Tests laufen vorher) gehen live.
- Nie ins Repo: `.env`, Zugangsdaten, echte Mails, Recherche-Daten und Rechtsnotizen (das Repo ist öffentlich). `apps/engine/test/fixtures/test-dkim-private.pem` ist ein reiner Testschlüssel für die Beispiel-Domains `*.example.test` und wird nirgends produktiv genutzt.

## Lizenz

- **Code:** [AGPL-3.0](LICENSE). Du darfst ihn nutzen, ändern und weitergeben. Wer eine veränderte Fassung als öffentlichen Dienst betreibt, muss deren Quellcode offenlegen.
- **Texte, Logo, Design und der Name e-mail-check.de:** alle Rechte vorbehalten, siehe [LICENSE-CONTENT.md](LICENSE-CONTENT.md).
- **Nicht im Repo:** Recherche-Daten (Keywords, SERP- und Wettbewerbsanalyse), Rechtsnotizen und interne Prüflisten. Sie liegen nur lokal (`research/`, `docs/recht-notizen.md`, `docs/offene-punkte.md`, siehe `.gitignore`).
