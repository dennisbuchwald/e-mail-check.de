# Deployment

Stand 21.10.2026: **Öffentlich live** auf https://e-mail-check.de (Passwortschutz am 21.10.2026 auf Dennis' Wunsch entfernt).

## Ist-Stand

| Was | Wert |
|---|---|
| Server | Hetzner Cloud CAX11 „e-mail-check“, Falkenstein, Ubuntu 26.04, Projekt 16480297 |
| IPv4 / IPv6 | 167.235.225.13 / 2a01:4f8:1c17:677f::1 |
| PTR | 167.235.225.13 → mx.e-mail-check.de |
| Domain + DNS | IONOS (Nameserver ui-dns). IONOS-Mail-Einträge (MX, SPF `include:_spf-eu.ionos.com ~all`, DKIM s1/s2-ionos, DMARC-CNAME) bleiben für Postfächer wie kontakt@ |
| Eigene Einträge | A/AAAA `@` und `www`, A `mx`, MX `test` → `10 mx.e-mail-check.de`, TXT `test` → `v=spf1 -all` |
| TLS | Let's Encrypt für e-mail-check.de, www, mx (Caddy), STARTTLS auf Port 25 (TLS 1.3 getestet) |
| Geprüft | Außen-Testmail per swaks: echte Client-IP kommt an, Spamhaus antwortet über unbound, Ergebnis korrekt |
| Deploy | `DEPLOY_HOST=167.235.225.13 scripts/deploy.sh` |

## Noch offen nach dem Go-live
1. Impressum: E-Mail (Pflicht nach § 5 DDG) und ggf. Telefon eintragen.
2. Datenschutz + Infoseite fachlich prüfen lassen, dann `noindex` aus `datenschutz.astro` und `avv.astro` entfernen.
3. Search Console verifizieren, Sitemap einreichen.

---

Ursprüngliche Planung (Abschnitte A bis E):

## A. Was Dennis freigeben bzw. selbst tun muss

Reihenfolge einhalten, jeder Punkt ist ein eigener Schritt.

| # | Was | Wer | Kosten | Warum ich es nicht mache |
|---|---|---|---|---|
| 1 | **Domain `e-mail-check.de` registrieren.** Laut DENIC-Whois ist sie am 21.10.2026 **frei**. Empfehlung: bei deinem bestehenden Registrar, Nameserver danach auf Hetzner DNS (siehe 3). | Dennis | Domain-Gebühr des Registrars | Kauf + Konto |
| 2 | **Hetzner-Cloud-Server anlegen:** neues Projekt „e-mail-check“, Typ **CAX11** (ARM, 2 vCPU, 4 GB) oder größer, Standort Nürnberg oder Falkenstein, Image **Ubuntu 24.04**, deinen SSH-Key auswählen, IPv4 + IPv6 an, bei „Cloud config“ den Inhalt von `infra/server/cloud-init.yml` einfügen. Optional zusätzlich eine Hetzner-Firewall mit den Ports 22, 25, 80, 443. | Dennis (oder ich mit Freigabe + API-Token) | laut Hetzner-Preisliste | Konto + laufende Kosten |
| 3 | **DNS-Einträge** setzen (Tabelle unten) | Dennis (oder ich mit Freigabe) | 0 € bei Hetzner DNS | Domains/DNS nur mit Freigabe |
| 4 | **Reverse DNS (PTR)** der Server-IPv4 auf `mx.e-mail-check.de` (Hetzner Console → Server → Netzwerk → Reverse DNS) | Dennis | 0 € | Konto |
| 5 | **`.env` auf dem Server** ausfüllen (`cp .env.example .env`), Vorschau-Passwort-Hash | Dennis oder ich per SSH | – | Server-Zugriff |
| 6 | **Freigabe Deploy:** `DEPLOY_HOST=<ip> scripts/deploy.sh` | ich, nach deinem OK | – | Deploy nur mit Freigabe |
| 7 | **Go-live-Freigabe Inhalte:** Impressum vollständig, Datenschutz/AVV geprüft, `noindex` raus, Anleitungen geprüft | Dennis | – | Rechtliches |
| 8 | Google Search Console verifizieren (DNS-TXT) und Sitemap einreichen | Dennis | 0 € | Konto |

**Wenn du mir Punkt 2 und 3 überlassen willst:** Leg in der Hetzner Console ein API-Token (Lesen + Schreiben) nur für das neue Projekt an. Dann erstelle ich Server, Firewall und DNS-Zone per API, und du gibst jeden Schritt einzeln frei. Den Token gibst du mir per Umgebungsvariable, nicht im Chat.

## B. DNS-Einträge

`<IPv4>`/`<IPv6>` = Adressen des neuen Servers.

| Name | Typ | Wert | Zweck |
|---|---|---|---|
| `e-mail-check.de` | A | `<IPv4>` | Website |
| `e-mail-check.de` | AAAA | `<IPv6>` | Website |
| `www` | A / AAAA | `<IPv4>` / `<IPv6>` | Weiterleitung auf die Hauptdomain |
| `mx` | A | `<IPv4>` | Mail-Empfang + TLS-Zertifikat |
| `test` | MX | `10 mx.e-mail-check.de.` | Testadressen `…@test.e-mail-check.de` |
| `e-mail-check.de` | TXT | `v=spf1 -all` | Hauptdomain verschickt keine Mails (mit gutem Beispiel voran) |
| `_dmarc` | TXT | `v=DMARC1; p=reject` | dito |
| `test` | TXT | `v=spf1 -all` | Testdomain verschickt keine Mails |
| `e-mail-check.de` | CAA | `0 issue "letsencrypt.org"` | nur Let's Encrypt darf Zertifikate ausstellen |

**Bewusst kein AAAA für `mx`:** Docker leitet IPv6 standardmäßig über einen Proxy weiter. Die Engine würde dann nicht die echte Absender-IP sehen, und SPF wäre falsch. IPv4 reicht für den Empfang, alle großen Absender liefern auch per IPv4 aus.

## C. Was vorbereitet ist (im Repo)

| Datei | Inhalt |
|---|---|
| `docker-compose.prod.yml` | Port 25 statt 2525, XCLIENT hart aus, STARTTLS-Zertifikat, Ports 80/443 (+ HTTP/3), Log-Rotation, Healthcheck |
| `infra/caddy/Caddyfile.prod` | automatisches HTTPS (Let's Encrypt), HSTS, `www` → Hauptdomain, Zertifikat auch für `mx.` |
| `infra/caddy/site.caddy` | gemeinsamer Kern für lokal und live (Security-Header, CSP, `/api`, `/ergebnis`, Caching, 404) |
| `infra/certsync/sync.sh` | kopiert das `mx.`-Zertifikat aus Caddy für die Engine (lesbar nur für sie), stündlich |
| `apps/engine/src/tls.ts` | STARTTLS, wartet beim ersten Start bis 10 Min. aufs Zertifikat, tauscht es nach Erneuerung ohne Neustart (getestet) |
| `infra/server/cloud-init.yml` | Nutzer `deploy`, Docker (`userland-proxy: false` für echte Client-IPs), ufw (22/25/80/443), fail2ban, SSH nur per Key, automatische Sicherheitsupdates |
| `scripts/deploy.sh` | Tests → rsync → `docker compose … up -d --build` → Healthcheck |
| `.env.example` | alle Werte für den Server |

## D. Ablauf am Tag X (nach Freigaben 1 bis 5)

1. Server ist da, cloud-init ist durch (ca. 3 Min.). Prüfen: `ssh deploy@<ip> docker version`.
2. DNS gesetzt, Prüfen: `dig +short A mx.e-mail-check.de` und `dig +short MX test.e-mail-check.de`.
3. `.env` auf dem Server anlegen.
4. `DEPLOY_HOST=<ip> scripts/deploy.sh`.
5. Caddy holt die Zertifikate (ca. 1 Min.), certsync kopiert das `mx.`-Zertifikat, die Engine startet SMTP mit STARTTLS. Log: `docker compose logs engine` → „smtp listening on :2525 … (STARTTLS)“.
6. **Echter Test:** Von Gmail und Outlook je eine Mail an eine frische Testadresse schicken. Erwartung: Ergebnis kommt, „Server-Ruf“ zeigt eine **öffentliche** IP (keine 172.x). Falls 172.x: `userland-proxy` greift nicht, dann Docker neu starten.
7. TLS prüfen: `swaks --to <adresse> --server mx.e-mail-check.de --tls`.
8. Sperrlisten prüfen: In den technischen Details des Ergebnisses steht bei Spamhaus `listed: false` (nicht `null`). `null` heißt, die Abfrage wurde abgelehnt.
9. Barracuda: Server-IP auf barracudacentral.org registrieren, sonst bleibt diese Liste stumm (optional).

## E. Betrieb

- **Deploy (seit Audit 21.10.2026):** `DEPLOY_HOST=167.235.225.13 scripts/deploy.sh` geht nur von einem sauberen, gepushten `main` aus. Das Skript exportiert genau den Commit (`git archive`, nie der Arbeitsstand), sichert vorher den Zähler, baut, prüft `/api/health` und setzt danach einen Tag `deploy-JJJJMMTT-HHMM`.
- **Rollback:** `DEPLOY_HOST=167.235.225.13 DEPLOY_REF=deploy-<älterer Tag> scripts/deploy.sh`. Tags: `git tag -l 'deploy-*'`.
- **Updates:** Basis-Images sind per Digest gepinnt (Dockerfiles, Compose). Dependabot schlägt wöchentlich Updates als Pull Request vor, CI (`.github/workflows/ci.yml`) prüft sie. Übernehmen, dann deployen.
- **Monitoring (noch einzurichten, Dennis):**
  - n8n prüft alle 5 Min. `https://e-mail-check.de/api/health` und meldet sich bei zwei Fehlschlägen in Folge.
  - Einmal pro Stunde: `POST /api/tests`, eine Mail an die Adresse schicken (n8n-Node „Send Email“ über ein echtes Postfach), nach 60 s `GET /api/tests/<id>` muss `state: done` liefern. Das zeigt sofort Probleme mit Port 25, MX oder TLS.
- **Backups:** Ergebnisse werden nach 7 Tagen gelöscht, eine Sicherung würde diese Zusage nur verlängern. Das einzig Dauerhafte ist der Gesamtzähler `mails_checked`: `deploy.sh` legt ihn vor jedem Deploy lokal unter `backups/counters-*.json` ab (gitignored). Wiederherstellen nach Verlust des Volumes: `MAILS_CHECKED_SEED=<Wert>` in die `.env` auf dem Server, deployen (der Zähler sinkt dadurch nie). Zählweise: pro ausgewerteter Testadresse, eine Mail an drei Testadressen zählt also dreimal.
- **Logs:** Docker rotiert bei 3 × 10 MB je Dienst. Caddy schreibt kein Access-Log. Warnungen und Fehler von Caddy enthalten den Request, deshalb filtert die globale `log`-Option IP, Port und Kopfzeilen heraus (vorher standen IP und Browser-Kennung darin, live festgestellt im Audit). Die Engine loggt keine IP-Adressen.
- **Grenzen:** Engine 1 GB RAM und 1,5 CPU, rspamd 768 MB, Caddy 384 MB, unbound 256 MB (`docker-compose.prod.yml`). SMTP: 3 Verbindungen pro IP, 5 Empfänger pro Mail, Trennung nach 10 unbekannten Empfängern, höchstens 4 Auswertungen gleichzeitig, Abbruch nach 90 s. SSE: 5 Streams pro IP.
- **Statistik (Umami):** nur mit `COMPOSE_PROFILES=stats` in der `.env`. Dann müssen `UMAMI_APP_SECRET` (≥ 32 Zeichen) und `UMAMI_DB_PASSWORD` (≥ 16) gesetzt sein, `deploy.sh` bricht sonst ab. Öffentlich sind nur `/stats/script.js` und `/stats/api/send`, die Oberfläche ist von außen nicht erreichbar (Port nicht veröffentlicht). Login danach sofort vom Standard ändern.
- **Server-Härtung, live noch offen (Dennis entscheidet):** `infra/server/cloud-init.yml` setzt für neue Server `PermitRootLogin no` und gibt `deploy` kein sudo mehr. Auf dem laufenden Server ist das noch der alte Stand. Umstellen per `sudo sed -i 's/^PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config.d/10-hardening.conf && sudo systemctl reload ssh`, vorher prüfen, dass der Login als `deploy` klappt. Sudo für `deploy` erst danach entziehen.
- **Spamhaus:** kostenlos nur nicht-kommerziell. Sobald Werbung läuft: DQS-Zugang oder Spamhaus aus `apps/engine/src/checks/reputation.ts` entfernen.
- **Ressourcen (lokal gemessen 21.10.2026):** rspamd ca. 180 MB, Engine ca. 60 MB, Caddy ca. 45 MB, unbound ca. 10 MB. Zusammen unter 300 MB, CAX11 (4 GB) hat viel Luft.
