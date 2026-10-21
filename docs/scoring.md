# Score-Berechnung

Quelle der Werte: `packages/shared/src/scoring.ts` (`POINTS`). Diese Datei und der Code müssen übereinstimmen.

## Prinzip

- Jede Mail startet bei **10 Punkten**.
- Jeder Befund kann Punkte abziehen. Die Abzüge stehen im Ergebnis bei jedem Prüfpunkt (Rohdaten), damit der Score nachvollziehbar bleibt.
- Score = max(0, 10 − Summe der Abzüge), auf eine Nachkommastelle gerundet.
- Prüfpunkte werden nach Schwere sortiert: Problem → Hinweis → OK → nicht geprüft.

## Ampel

| Ampel | Bedingung |
|---|---|
| Rot | mindestens ein Problem **oder** Score < 5 |
| Orange | Score < 8 |
| Grün | sonst |

Ein einzelnes echtes Problem macht die Ampel rot, auch wenn der Score noch hoch ist. So übersieht niemand einen fehlenden DMARC-Eintrag bei 8,5 Punkten.

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
| jede weitere Liste (SpamCop, Barracuda, NiX Spam, PSBL) | 1 |
| Sperrlisten gesamt höchstens | 4 |
| kein PTR-Eintrag | 1 (Problem) |
| PTR zeigt nicht zurück auf die IP | 0,5 (Hinweis) |

- Private/lokale IPs werden nicht geprüft (Status „nicht geprüft“, kein Abzug).
- UCEPROTECT ist bewusst nicht dabei: Austragung kostet Geld, Listungen sind oft pauschal ganze Netze.
- Abfragen laufen über den eigenen Resolver (unbound). Spamhaus blockt öffentliche Resolver. Antworten `127.255.255.x` gelten als „Abfrage abgelehnt“, nicht als Listung.

### Inhalt (Spam-Score)
rspamd bewertet nur den Inhalt. SPF/DKIM/DMARC/ARC, IP-Sperrlisten, Received-Header, Bayes, Fuzzy und Neural sind abgeschaltet oder werden herausgefiltert (doppelte Wertung vermeiden, keine Hash-Abfragen bei Dritten).

- Content-Score = Summe der verbleibenden rspamd-Symbole.
- Abzug = 0 bis 1 Punkt rspamd, darüber `(score − 1) × 0,5`, höchstens 4.
- Abzug ≥ 2 → Problem, sonst Hinweis.
- GTUBE (Spam-Testmuster) führt in rspamd zur sofortigen Ablehnung ohne Punkte, wird deshalb als volle Spam-Punktzahl gewertet.
- rspamd nicht erreichbar → „nicht geprüft“, kein Abzug.

## Beispiele

| Mail | Score | Ampel |
|---|---|---|
| alles sauber | 10,0 | grün |
| kein SPF, Rest ok | 8,5 | rot |
| keine DKIM-Signatur, DMARC `p=none` | 7,8 | rot |
| Spam-Testmuster | 6,0 bzw. weniger | rot |
