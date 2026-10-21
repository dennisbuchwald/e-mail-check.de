# Deployment-Checkliste (nicht ausgeführt)

Nichts davon ist umgesetzt. Jeder Schritt braucht Dennis' Freigabe (Server, DNS, Konten).

## 1. Server
- [ ] Eigener kleiner Hetzner-Cloud-Server in Deutschland (Empfehlung: CAX11 oder CX22, Standort Nürnberg/Falkenstein). Nicht auf dem n8n-Server: Der Dienst nimmt Mails von Fremden an.
- [ ] Übergangsweise auf dem bestehenden CAX11 nur, wenn RAM reicht: rspamd + engine + unbound + Caddy brauchen zusammen ca. 600 bis 900 MB. n8n vorher messen.
- [ ] Docker + Compose installieren, Firewall: 22 (nur eigene IP), 25, 80, 443 offen.
- [ ] Hetzner sperrt Port 25 ausgehend für neue Konten. Für uns ist nur **eingehend** nötig, das ist offen. Ausgehend brauchen wir nichts.

## 2. DNS
- [ ] `A`/`AAAA` für `e-mail-check.de` und `www` → Server-IP. `www` per Caddy auf die Hauptdomain umleiten.
- [ ] `A`/`AAAA` für `mx.e-mail-check.de` → Server-IP.
- [ ] `MX` für `test.e-mail-check.de` → `mx.e-mail-check.de` (Priorität 10).
- [ ] **PTR/rDNS** der Server-IP auf `mx.e-mail-check.de` setzen (Hetzner Cloud Console → Server → Netzwerk). Manche Absender liefern sonst nicht ein.
- [ ] Für die Hauptdomain selbst: SPF `v=spf1 -all`, DMARC `v=DMARC1; p=reject`, solange sie keine Mails verschickt. Mit gutem Beispiel vorangehen.
- [ ] CAA-Eintrag für Let's Encrypt (optional).

## 3. Konfiguration
- [ ] `ALLOW_XCLIENT` **entfernen**. Lokal erlaubt es simulierte IPs, im Betrieb wäre es eine Lücke.
- [ ] SMTP auf Port 25 statt 2525: `SMTP_PORT=25` oder Port-Mapping `25:2525`.
- [ ] STARTTLS: Zertifikat für `mx.e-mail-check.de` (Caddy kann es holen, Pfad per `TLS_KEY`/`TLS_CERT` an die Engine geben). Mailserver erwarten TLS.
- [ ] Caddyfile: `:80` durch `e-mail-check.de, www.e-mail-check.de` ersetzen (automatisches HTTPS), `auto_https off` entfernen. HSTS-Header ergänzen.
- [ ] Mail-Größe (`MAX_MESSAGE_BYTES`, Standard 10 MB) und Rate-Limits (`RATE_LIMIT_TESTS=10`, `RATE_LIMIT_DNS=30`) bestätigen.
- [ ] `.env` mit Secrets (Umami) nur auf dem Server, nie im Repo.

## 4. Sperrlisten
- [ ] Spamhaus ist kostenlos nur für nicht-kommerzielle Nutzung mit geringem Volumen. Sobald Werbung läuft: Spamhaus DQS (kostenpflichtig) oder Spamhaus entfernen. Konfiguration: `apps/engine/src/checks/reputation.ts`.
- [ ] Barracuda verlangt die Registrierung des abfragenden DNS-Servers (barracudacentral.org), sonst kommen keine Antworten.
- [ ] Nach dem Start prüfen, dass Abfragen über unbound laufen und nicht mit `127.255.255.x` (Abfrage abgelehnt) beantwortet werden.

## 5. Backups & Daten
- [ ] Gespeichert werden nur SQLite-Zusammenfassungen (Volume `data`), die nach 7 Tagen ohnehin gelöscht werden. Ein Backup ist nicht nötig. Bewusst so lassen, damit wir keine Ergebnisse länger als 7 Tage halten.
- [ ] Server-Logs (Caddy, Docker) begrenzen: Log-Rotation, max. 7 Tage. In Datenschutzerklärung eintragen.

## 6. Monitoring
- [ ] `/api/health` von außen prüfen, z. B. per n8n alle 5 Minuten, Alarm per Mail.
- [ ] Echter Ende-zu-Ende-Test: n8n schickt stündlich eine Mail an eine frische Testadresse und prüft, dass ein Ergebnis kommt. Damit fallen Port-25- oder MX-Probleme sofort auf.
- [ ] Container mit `restart: unless-stopped` (ist gesetzt), Updates für rspamd/caddy/node monatlich.

## 7. Recht & Inhalte vor Livegang
- [ ] Impressum ausfüllen (Platzhalter in `apps/web/src/pages/impressum.astro`).
- [ ] Datenschutzerklärung und AVV fachlich prüfen lassen, dann `noindex` entfernen.
- [ ] `docs/offene-punkte.md` abarbeiten. Jede Anleitung gegen die echte Oberfläche prüfen, danach `geprueft: true` setzen.
- [ ] Google Search Console einrichten, Sitemap `https://e-mail-check.de/sitemap-index.xml` einreichen.
