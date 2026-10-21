# Deployment

Stand 21.10.2026. **Nichts davon ist ausgeführt.** Alles ist vorbereitet und getestet, soweit das ohne Server geht.

## A. Was Dennis freigeben bzw. selbst tun muss

Reihenfolge einhalten, jeder Punkt ist ein eigener Schritt.

| # | Was | Wer | Kosten | Warum ich es nicht mache |
|---|---|---|---|---|
| 1 | **Domain `e-mail-check.de` registrieren.** Laut DENIC-Whois ist sie am 21.10.2026 **frei**. Empfehlung: bei deinem bestehenden Registrar, Nameserver danach auf Hetzner DNS (siehe 3). | Dennis | Domain-Gebühr des Registrars | Kauf + Konto |
| 2 | **Hetzner-Cloud-Server anlegen:** neues Projekt „e-mail-check“, Typ **CAX11** (ARM, 2 vCPU, 4 GB) oder größer, Standort Nürnberg oder Falkenstein, Image **Ubuntu 24.04**, deinen SSH-Key auswählen, IPv4 + IPv6 an, bei „Cloud config“ den Inhalt von `infra/server/cloud-init.yml` einfügen. Optional zusätzlich eine Hetzner-Firewall mit den Ports 22, 25, 80, 443. | Dennis (oder ich mit Freigabe + API-Token) | laut Hetzner-Preisliste | Konto + laufende Kosten |
| 3 | **DNS-Einträge** setzen (Tabelle unten) | Dennis (oder ich mit Freigabe) | 0 € bei Hetzner DNS | Domains/DNS nur mit Freigabe |
| 4 | **Reverse DNS (PTR)** der Server-IPv4 auf `mx.e-mail-check.de` (Hetzner Console → Server → Netzwerk → Reverse DNS) | Dennis | 0 € | Konto |
| 5 | **`.env` auf dem Server** ausfüllen (`cp .env.example .env`), mindestens `ACME_EMAIL` | Dennis oder ich per SSH | – | Server-Zugriff |
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

- **Updates:** `scripts/deploy.sh` erneut. Basis-Images (rspamd, caddy, node, alpine) monatlich neu bauen: `docker compose … build --pull`.
- **Monitoring:**
  - n8n prüft alle 5 Min. `https://e-mail-check.de/api/health`.
  - Einmal pro Stunde schickt n8n eine echte Mail an eine frische Testadresse und erwartet ein Ergebnis. Das zeigt sofort Probleme mit Port 25, MX oder TLS.
- **Backups:** keine nötig. Es gibt nur Zusammenfassungen, die nach 7 Tagen ohnehin gelöscht werden. Der Code liegt im Repo.
- **Logs:** Docker rotiert bei 3 × 10 MB je Dienst. Caddy schreibt kein Access-Log (nicht konfiguriert). So steht es auch in der Datenschutzerklärung.
- **Spamhaus:** kostenlos nur nicht-kommerziell. Sobald Werbung läuft: DQS-Zugang oder Spamhaus aus `apps/engine/src/checks/reputation.ts` entfernen.
- **Ressourcen (lokal gemessen 21.10.2026):** rspamd ca. 180 MB, Engine ca. 60 MB, Caddy ca. 45 MB, unbound ca. 10 MB. Zusammen unter 300 MB, CAX11 (4 GB) hat viel Luft.
