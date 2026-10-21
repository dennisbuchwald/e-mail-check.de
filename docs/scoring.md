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

Pro Bereich zeigt das Ergebnis einen Balken in Prozent (`subScores`): 100 % minus Abzüge im Bereich geteilt durch den größtmöglichen Abzug (`AREA_MAX`).

| Bereich | Prüfpunkte | größter Abzug |
|---|---|---|
| Authentifizierung | SPF, DKIM, DMARC | 7 |
| Server-Ruf | Sperrlisten, rDNS | 5 |
| Inhalt | Spam-Score, Links, Abmelde-Link | 6 |

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

### Server-Ruf (Sperrlisten, rDNS)
| Befund | Abzug |
|---|---|
| Spamhaus ZEN gelistet | 3 |
| jede weitere Liste (SpamCop, Barracuda, PSBL) | 1 |
| Sperrlisten gesamt höchstens | 4 |
| kein PTR-Eintrag | 1 (Problem) |
| PTR zeigt nicht zurück auf die IP | 0,5 (Hinweis) |

Sonderfall **Spamhaus PBL** (Antwort `127.0.0.10` oder `127.0.0.11`): Die IP gehört zu einem normalen Internetanschluss. Das ist kein Spam-Vorwurf, große Anbieter nehmen von dort aber keine Mails direkt an. Die 3 Punkte bleiben, Titel und Text erklären stattdessen den Weg über den Postausgangsserver des Anbieters statt „austragen lassen“.

- Private/lokale IPs werden nicht geprüft (Status „nicht geprüft“, kein Abzug).
- UCEPROTECT ist bewusst nicht dabei: Austragung kostet Geld, Listungen sind oft pauschal ganze Netze.
- Abfragen laufen über den eigenen Resolver (unbound). Spamhaus blockt öffentliche Resolver. Antworten `127.255.255.x` gelten als „Abfrage abgelehnt“, nicht als Listung.

### Inhalt (Spam-Score)
rspamd bewertet nur den Inhalt. SPF/DKIM/DMARC/ARC, IP-Sperrlisten, Received-Header, Bayes, Fuzzy und Neural sind abgeschaltet oder werden herausgefiltert (doppelte Wertung vermeiden, keine Hash-Abfragen bei Dritten).

- Content-Score = Summe der verbleibenden rspamd-Symbole.
- Abzug = 0 bis 1 Punkt rspamd, darüber `(score − 1) × 0,5`, höchstens 4.
- Abzug ≥ 2 → Problem, sonst Hinweis.
- GTUBE (Spam-Testmuster) führt in rspamd zur sofortigen Ablehnung ohne Punkte, wird deshalb als volle Spam-Punktzahl gewertet.
- rspamd nicht erreichbar → „nicht geprüft“, kein Abzug (Link- und Abmelde-Prüfung laufen trotzdem).

### Inhalt: Links und Newsletter (gleicher Prüfpunkt)
| Befund | Abzug |
|---|---|
| toter Link (404, 410, Domain existiert nicht, Verbindung abgelehnt), je Link | 0,5, höchstens 1 |
| Kurz-Link (bit.ly, tinyurl.com …) | 0,5 |
| sieht aus wie Newsletter, aber keine `List-Unsubscribe`-Kopfzeile | 0,5 |
| `List-Unsubscribe` da, aber kein One-Click (`List-Unsubscribe-Post`) | 0, nur Tipp |

- Geprüft werden höchstens 10 Links, Abmelde-Links nie (das würde den Absender abmelden).
- 401/403/429/5xx und Zeitüberschreitungen zählen **nicht** als tot (oft Bot-Schutz oder kurzer Ausfall).
- SSRF-Schutz: nur öffentliche IPs, nur Port 80/443, jede Weiterleitung wird neu geprüft, keine Zugangsdaten in URLs.
- Gespeichert werden nur Domainnamen und Grund, nie vollständige Adressen.
- „Newsletter“ heißt: `List-Unsubscribe`, `List-Id`, `Precedence: bulk/list`, typische Newsletter-Kopfzeilen (Mailchimp, Brevo, Mailjet, CleverReach …) oder ein Abmelde-Link im Text.

## Beispiele

| Mail | Score | Ampel |
|---|---|---|
| alles sauber | 10,0 | grün |
| kein SPF, Rest ok | 8,5 | rot (Ausnahme-Regel) |
| keine DKIM-Signatur, DMARC `p=none` | 7,8 | rot |
| Spam-Testmuster | 6,0 bzw. weniger | rot |
