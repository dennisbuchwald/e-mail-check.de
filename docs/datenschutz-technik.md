# Datenschutz in der Technik (Stand 21.10.2026)

Was mit einer Testmail technisch passiert, wo es im Code steht und was gespeichert wird. Grundlage für die Datenschutzerklärung (`apps/web/src/pages/datenschutz.astro`).

## Ablauf

| Schritt | Wo | Was passiert | Gespeichert? |
|---|---|---|---|
| Empfang | `apps/engine/src/smtp.ts` | Mail nur im Arbeitsspeicher, unbekannte Adressen werden beim `RCPT TO` abgelehnt | nein |
| Prüfung | `apps/engine/src/analyze.ts` | SPF/DKIM/DMARC, Sperrlisten, rspamd, eigene Inhalts-Checks, Zustellkette | nein, nur das Ergebnis unten |
| Ergebnis | `apps/engine/src/store.ts` (SQLite) | Score, Prüfpunkte, technische Prüfwerte | ja, 7 Tage, dann automatisch gelöscht |
| Betreff + Absender | `received`-Schritt im Live-Stream (`/api/tests/<id>/events`), nur mit der Test-ID | im Ergebnis-Kopf der Person, die getestet hat | nur RAM, bis 60 s nach der Prüfung; `/api/results/<id>` liefert sie nie (Audit C3, 21.10.2026) |
| Text, HTML, Kopfzeilen („Mail-Quelle & Header“) | `previewOf` in `analyze.ts`, `done`-Event in `service.ts` | einmal live an den Browser des Testers geschickt, gekürzt (Text 100.000, HTML 300.000, Kopfzeilen 30.000 Zeichen) | **nein**, weder Datenbank noch Ergebnis-Link; ein späterer Abonnent (SSE-Replay) bekommt es nicht |
| Geteilter Link | `GET /api/results/<id>/view`, Caddy-Templates | serverseitig gerendert, ohne Betreff und Absender | nur das Ergebnis |

## Was im gespeicherten Ergebnis steht

- Score, Band, Urteil, Prüfpunkte mit Abzügen
- IP und rDNS-Name des sendenden Servers, HELO-Name
- gefundene DNS-Einträge (SPF, DMARC), DKIM-Domain, Selektor, Schlüssellänge
- Treffer auf Sperr- und Positivlisten (nur Listenname und Antwortcode)
- Namen der rspamd-Regeln mit Punkten (nie die `options`, die Textstellen enthalten)
- Servernamen der Zustellkette aus `Received` (nur „by …“, nie „from …“, also nie das eigene Gerät oder private IPs) und Sekunden
- TLS-Version
- Zahl der Links, Domains, Wörter und Bilder, Namen verwendeter Kurz-Link-Dienste, ob ein Abmelde-Link im Header steht

Nicht gespeichert: Text, HTML, Anhänge, vollständige Links, Link-Domains, Betreff, Absenderadresse (außer der Domain), Empfänger.

## Links

Links in der Mail werden **nie aufgerufen** (kein HEAD, kein GET). Ein Test (`links.test.ts`) prüft, dass das Link-Modul keinen Netzwerk-Code enthält. Die Domains aus Links prüft rspamd gegen Spamhaus DBL, SURBL und URIBL; diese erhalten nur den Domainnamen.

## HTML-Vorschau

Die HTML-Fassung läuft im Browser in einem `iframe` mit `sandbox=""` (keine Skripte, keine Formulare, eigener Ursprung) und einer Content-Security-Policy `default-src 'none'; style-src 'unsafe-inline'; img-src data:`. Externe Bilder, Schriften und Tracking-Pixel werden dadurch nie geladen.

## Dritte

Sperrlisten-Betreiber erhalten per DNS die IP des sendenden Servers (Liste: `docs/scoring.md`), die Link-Domain-Listen nur Domainnamen. Alles über den eigenen Resolver (unbound), nie über öffentliche Resolver.
