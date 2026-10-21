# Score-Berechnung

Quelle der Werte: `packages/shared/src/scoring.ts` (`POINTS`). Diese Datei und der Code müssen übereinstimmen.

## Prinzip

- Jede Mail startet bei **10 Punkten**.
- Jeder Befund kann Punkte abziehen. Die Abzüge stehen im Ergebnis bei jedem Prüfpunkt (Rohdaten), damit der Score nachvollziehbar bleibt.
- Score = max(0, 10 − Summe der Abzüge), auf eine Nachkommastelle gerundet.
- Prüfpunkte werden nach Schwere sortiert: Problem → Hinweis → OK → nicht geprüft.

## Bereiche (Bänder)

Die Zahl wird im Ergebnis und auf der Startseite in vier Bänder übersetzt (`BANDS`):

| Band | Score | Bedeutung |
|---|---|---|
| Hohes Risiko | 0 bis 4,9 | Viele Mails landen im Spam. Erst beheben, dann versenden. |
| Gefährdet | 5 bis 6,9 | Echtes Spam-Risiko. Die markierten Punkte zuerst angehen. |
| Solide | 7 bis 8,9 | Kommt meist an. Ein paar Details bringen Sicherheit. |
| Sehr gut | 9 bis 10 | Alles im grünen Bereich. |

## Ausnahme-Regel

Schlägt SPF, DKIM oder DMARC fehl (Status Problem), warnen wir **immer**, egal wie hoch die Zahl ist (`hasAuthFailure`). Das Ergebnis zeigt dafür eine eigene Ausnahme-Karte. Grund: Ein einzelner Fehler bei der Authentifizierung reicht, damit Gmail oder Outlook ablehnen.

## Ampel

| Ampel | Bedingung |
|---|---|
| Rot | mindestens ein Problem **oder** Score < 5 |
| Orange | Score < 9 oder mindestens ein Hinweis |
| Grün | sonst |

## Teil-Scores

Pro Bereich steht ein Wert in Prozent im Ergebnis (`subScores`, in der Ansicht V2 nicht mehr als Balken, aber in den Daten): 100 % minus Abzüge im Bereich geteilt durch den größtmöglichen Abzug (`AREA_MAX`).

| Bereich | Prüfpunkte | größter Abzug |
|---|---|---|
| Authentifizierung | SPF, Absender-Domain, DKIM, DMARC | 7,2 |
| Server-Ruf | Sperrlisten, rDNS, Transport | 5,5 |
| Inhalt | Spam-Score, Kurz-Links, Abmelde-Link, Bild/Text | 5,3 |

Wurde ein Bereich nicht geprüft, fehlt der Balken (statt 0 %).

## Punkte pro Behebung

Jeder Befund mit Abzug bekommt `gain` = Summe seiner Abzüge, also genau die Punkte, die das Beheben zurückbringt. Daraus folgt die Wirkung (`impactFor`): **hoch** ab 1,5 Punkten, **mittel** ab 0,5, sonst **gering**. Der Aktionsplan sortiert Probleme vor Hinweisen und innerhalb davon nach Punkten, größte Wirkung zuerst.

## Abzüge

### Absender bestätigt (SPF)
Geprüft wird die Domain aus `MAIL FROM` gegen die IP des sendenden Servers.

| Ergebnis | Status | Abzug |
|---|---|---|
| pass | OK | 0 |
| neutral (`?all`) | Hinweis | 0,5 |
| softfail (`~all` greift) | Hinweis | 1 |
| none (kein Eintrag) | Problem | 1,5 |
| permerror (kaputt, > 10 Lookups, zwei Einträge) | Problem | 1,5 |
| fail (`-all` greift) | Problem | 2 |
| temperror | Hinweis | 0,5 |

### Mail unterschrieben (DKIM)
| Ergebnis | Status | Abzug |
|---|---|---|
| gültige Signatur der Absender-Domain (aligned) | OK | 0 |
| gültig, aber fremde Domain (z. B. Versanddienst) | Hinweis | 0,5 |
| keine Signatur | Problem | 2 |
| Signatur ungültig (Schlüssel fehlt, Inhalt verändert, Schlüssel zu kurz) | Problem | 2,5 |
| temperror | Hinweis | 0,5 |

Schlüssel unter 2048 Bit: nur Tipp im Text, kein Abzug.

### Schutzregel (DMARC)
Auswertung nach RFC 9989 inkl. Alignment (über `mailauth`).

| Ergebnis | Status | Abzug |
|---|---|---|
| pass mit `p=quarantine` oder `p=reject` | OK | 0 |
| pass mit `p=none` | Hinweis | 0,2 |
| kein Eintrag | Problem | 1,5 |
| fail (weder SPF noch DKIM passen zur Absenderadresse) | Problem | 2,5 |
| From-Header fehlt/ungültig | Problem | 2,5 |
| temperror | Hinweis | 0,5 |

### Absender-Domain (Station 1, neben SPF)
| Befund | Status | Abzug |
|---|---|---|
| eigene Domain | OK | 0 |
| Freemail-Absender (`packages/shared/src/freemail.json`: gmail, icloud, gmx, web.de, t-online, outlook, yahoo, posteo, proton …) | Hinweis | 0,2 |

Eine Mail wie Dennis' iCloud-Test (alles grün, Freemail) ergibt damit **9,8**.

### Server-Ruf (Sperrlisten, rDNS, HELO)
| Befund | Abzug |
|---|---|
| Spamhaus ZEN gelistet | 3 |
| jede weitere Liste | 1 |
| Sperrlisten gesamt höchstens | 4 |
| kein PTR-Eintrag | 1 (Problem) |
| PTR zeigt nicht zurück auf die IP | 0,5 (Hinweis) |
| HELO passt nicht zu rDNS oder IP | 0, nur angezeigt |
| Positivliste (DNSWL, Mailspike) | 0, nur „Guter Ruf“ angezeigt, nie verrechnet |

Sonderfall **Spamhaus PBL** (Antwort `127.0.0.10` oder `127.0.0.11`): Die IP gehört zu einem normalen Internetanschluss. Das ist kein Spam-Vorwurf, große Anbieter nehmen von dort aber keine Mails direkt an. Die 3 Punkte bleiben, Titel und Text erklären stattdessen den Weg über den Postausgangsserver des Anbieters statt „austragen lassen“.

**Abgefragte Listen** (Stand 21.10.2026, Recherche der Nutzungsbedingungen auf den offiziellen Seiten, Testpunkte vom Server aus geprüft). Nur Listen, die ohne Konto oder Schlüssel frei abgefragt werden dürfen:

| Liste | Zone | Was zählt | Warum |
|---|---|---|---|
| Spamhaus ZEN | `zen.spamhaus.org` | alle Treffer, PBL als Sonderfall | wichtigste Liste; frei nur nicht-kommerziell, kleines Volumen, eigener Resolver (erfüllt). Wird das Projekt kommerziell (Werbung), ist eine bezahlte DQS nötig |
| SpamCop | `bl.spamcop.net` | `127.0.0.2` | verbreitet, keine Einschränkung |
| PSBL | `psbl.surriel.com` | `127.0.0.2` | „Anybody is free to use PSBL“ |
| Mailspike | `bl.mailspike.net` | nur `.2`, `.10`, `.11` (Spamwelle, L5, L4) | abgestuft; L3/L2 wären zu streng |
| Truncate (GBUdb) | `truncate.gbudb.net` | `127.0.0.2` | sehr konservativ, wenig Fehlalarme |
| NordSpam | `bl.nordspam.com` | `127.0.0.2` | frei, auch kommerziell |
| s5h.net | `all.s5h.net` | `127.0.0.2` | frei ohne Limit |
| 0spam | `bl.0spam.org` | `127.0.0.2` | frei, auch kommerziell (nur `bl`, nicht `nbl`) |
| DroneBL | `dnsbl.dronebl.org` | Treffer | frei, auch kommerziell; trifft gekaperte Geräte |
| blocklist.de | `bl.blocklist.de` | Treffer | Angreifer-IPs der letzten 48 h |
| DNSWL (Positivliste) | `list.dnswl.org` | Vertrauen low/med/high (`127.0.x.1-3`) | frei bis 100.000 Anfragen/Tag |
| Mailspike WL (Positivliste) | `wl.mailspike.net` | H3 bis H5 (`.18`–`.20`) | Gegenstück zu Mailspike BL |

**Nicht dabei:** UCEPROTECT und Backscatterer (schnelles Austragen kostet Geld), Barracuda (braucht registrierten Resolver, sonst keine Antwort), SpamRATS (braucht kostenlosen API-Schlüssel), Abusix (Konto und Nutzungsbedingungen „service-bureau“ unklar), SORBS (abgeschaltet 2024), NiX Spam, LashBack, WPBL (antworten nicht mehr), Hostkarma (nicht RFC-konform). Barracuda und SpamRATS lassen sich nachrüsten, sobald Resolver bzw. Schlüssel registriert sind.

- Private/lokale IPs werden nicht geprüft (Status „nicht geprüft“, kein Abzug).
- Abfragen laufen über den eigenen Resolver (unbound). Antworten `127.255.255.x` (Spamhaus) bzw. `127.0.0.255` (DNSWL) gelten als „Abfrage abgelehnt“, nicht als Listung.
- Die Namen auf der Website kommen aus `IP_BLOCKLIST_NAMES` in `packages/shared`; ein Test hält sie gleich mit der Engine.

### Transport (Station 5)
| Befund | Status | Abzug |
|---|---|---|
| TLS 1.2 oder 1.3 | OK | 0 |
| TLS 1.0 oder 1.1 | Hinweis | 0,2 |
| ohne TLS | Hinweis | 0,5 |

Die Zustellkette kommt aus den `Received`-Kopfzeilen: nur die Servernamen („by …“) und die Sekunden ab der ersten Station, nie der „from“-Teil (der kann das eigene Gerät oder eine private IP enthalten).

### Inhalt (Spam-Score, Station 6)
rspamd bewertet nur den Inhalt. SPF/DKIM/DMARC/ARC, IP-Sperrlisten, Received-Header, Bayes, Fuzzy und Neural sind abgeschaltet oder werden herausgefiltert (doppelte Wertung vermeiden, keine Hash-Abfragen bei Dritten).

- Content-Score = Summe der verbleibenden rspamd-Symbole. Jede Regel steht einzeln im Ergebnis, mit deutschem Namen aus `packages/shared/src/rspamd-symbole.de.json` (unbekannte mit Originalnamen).
- Abzug = 0 bis 1 Punkt rspamd, darüber `(score − 1) × 0,5`, höchstens 4.
- Abzug ≥ 2 → Problem, sonst Hinweis. Ab 6 rspamd-Punkten sagt das Urteil „Deine Mail landet im Spam.“
- GTUBE (Spam-Testmuster) führt in rspamd zur sofortigen Ablehnung ohne Punkte, wird deshalb als volle Spam-Punktzahl gewertet.
- rspamd nicht erreichbar → „nicht geprüft“, kein Abzug.

### Inhalt: eigene Prüfungen (gleiche Station)
| Befund | Status | Abzug |
|---|---|---|
| Kurz-Link (bit.ly, tinyurl.com …) | Hinweis | 0,5 |
| sieht aus wie Newsletter, aber keine `List-Unsubscribe`-Kopfzeile | Hinweis | 0,3 |
| `List-Unsubscribe` da, aber kein One-Click (`List-Unsubscribe-Post`, RFC 8058) | Hinweis | 0 |
| fast nur ein Bild (Bild, unter 10 Wörter) | Hinweis | 0,3, oder 0, wenn rspamd es schon wertet |
| viel HTML, wenig Text (über 3.000 Zeichen HTML, unter 60 Wörter) | Hinweis | 0,2 |
| keine Textfassung (nur HTML) | Hinweis | 0 (rspamd wertet `MIME_HTML_ONLY`) |
| sehr kurze Mail (unter 15 Wörter) | Info | 0, ändert den Status nicht |

- **Links werden nie aufgerufen** (kein HEAD, kein GET), sonst würden Abmelde- oder Tracking-Links ausgelöst. Gezählt werden Links und Domains; die Domains prüft rspamd gegen Spamhaus DBL, SURBL und URIBL.
- „Newsletter“ heißt: `List-Unsubscribe`, `List-Id`, `Precedence: bulk/list`, typische Kopfzeilen von Versanddiensten (Mailchimp, Brevo, Mailjet, CleverReach …), ein Abmelde-Link im Text oder eine HTML-Mail mit mindestens 8 Links.
- rspamd-Regeln mit 0 Punkten aus dem Mail-Programm selbst (z. B. Apple Mails `MV_CASE`) werden nie zum Tipp.

## Stationen und Urteil
Die Ergebnisseite fasst die Befunde zu sechs Stationen zusammen (`packages/shared/src/stations.ts`): Absender (SPF + Absender-Domain), Unterschrift (DKIM), Schutzregel (DMARC), Server-Ruf, Transport, Posteingang (Inhalt). Status einer Station = schlechtester Befund. Geöffnet wird die erste Station mit Problem, sonst die erste mit Hinweis, sonst Station 1.

| Lage | Urteil (Zeile 1 / Zeile 2) |
|---|---|
| rspamd ≥ 6 | Deine Mail landet im Spam. / Der Inhalt ist das Problem (bei mehr als einem Problem: das größte Problem). |
| Score unter 5 | Hier landet viel im Spam. / So behebst du es. |
| mindestens ein Problem | Deine Mail kommt an, aber nicht überall. / Eine Sache bzw. N Dinge solltest du beheben. |
| nur Hinweise | Deine Mail kam sauber an. / Ein Tipp bzw. N Tipps für die letzte Stufe. |
| alles grün | Deine Mail kam sauber an. / Jede Station grün. |

## Beispiele

| Mail | Score | Ampel |
|---|---|---|
| alles sauber | 10,0 | grün |
| kein SPF, Rest ok | 8,5 | rot (Ausnahme-Regel) |
| keine DKIM-Signatur, DMARC `p=none` | 7,8 | rot |
| Spam-Testmuster | 6,0 bzw. weniger | rot |
| Freemail, sonst alles grün | 9,8 | orange (1 Hinweis) |
