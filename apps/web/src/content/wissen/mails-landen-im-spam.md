---
titel: "Warum landen meine Mails im Spam?"
seoTitel: "Warum landen meine Mails im Spam? Ursachen und Lösungen"
beschreibung: "Deine Mails landen beim Empfänger im Spam? Die häufigsten Ursachen, wie du sie in 30 Sekunden findest und Schritt für Schritt behebst."
keyword: "warum landen meine mails im spam"
kurz: "Meist fehlt deiner Domain ein Echtheitsnachweis: SPF, DKIM oder DMARC sind nicht oder falsch eingerichtet, oft weil ein Versender wie das Kontaktformular oder das Newsletter-Tool vergessen wurde. Seltener steht der Server auf einer Sperrliste oder der Inhalt wirkt verdächtig. Mit einer Testmail an unseren Mail-Tester findest du die Ursache in rund 30 Sekunden."
faq:
  - frage: "Was kann ich tun, damit meine Mails nicht im Spam landen?"
    antwort: "Richte SPF, DKIM und DMARC für alle Dienste ein, die Mails mit deiner Domain verschicken. Prüf, ob dein Server auf einer Sperrliste steht, und vermeide typische Spam-Merkmale im Inhalt. Eine Testmail an unseren Mail-Tester zeigt dir in 30 Sekunden, wo es hakt."
  - frage: "Warum landen plötzlich alle Mails im Spam?"
    antwort: "Häufige Auslöser sind eine Änderung im DNS (Anbieterwechsel, gelöschte Einträge), ein neu eingerichtetes Tool mit eigenem SPF-Eintrag, eine verschärfte DMARC-Regel oder eine Sperrliste nach einem gehackten Postfach. Prüf zuerst, was sich in den letzten Tagen geändert hat, und schick dann eine Testmail."
  - frage: "Warum werden meine E-Mails als Spam eingestuft?"
    antwort: "Spamfilter vergeben Punkte für verdächtige Merkmale: fehlende Echtheitsnachweise, schlechter Ruf des Servers, auffälliger Inhalt, viele Beschwerden. Ab einer Schwelle landet die Mail im Spam. Meist ist es nicht ein einziger Grund, sondern die Summe."
  - frage: "Wie prüfe ich, ob ich auf einer Blacklist stehe?"
    antwort: "Schick eine Testmail an unseren Mail-Tester. Der Prüfpunkt Server-Ruf fragt gängige Sperrlisten für den Server ab, der deine Mail tatsächlich verschickt hat. Das ist genauer, als die IP-Adresse von Hand zu suchen, weil du oft gar nicht weißt, welcher Server sendet."
quelle:
  - titel: "Google: Richtlinien für E-Mail-Absender"
    url: "https://support.google.com/a/answer/81126?hl=de"
  - titel: "Microsoft: Neue Anforderungen von Outlook für Vielversender"
    url: "https://techcommunity.microsoft.com/blog/outlook/strengthening-email-ecosystem-outlook%E2%80%99s-new-requirements-for-high%E2%80%90volume-senders/4399730"
  - titel: "RFC 7208: Sender Policy Framework (SPF)"
    url: "https://www.rfc-editor.org/rfc/rfc7208.html"
  - titel: "RFC 9989: Domain-based Message Authentication, Reporting, and Conformance (DMARC)"
    url: "https://www.rfc-editor.org/rfc/rfc9989.html"
stand: "2026-10-21"
reihenfolge: 5
---

## Erst testen, dann reparieren

Bevor du rätst, lass die Ursache messen. Schick eine ganz normale Mail an die Adresse, die dir unser [Mail-Tester](/) anzeigt, am besten aus dem System, dessen Mails im Spam landen: dem Postfach, dem Kontaktformular oder dem Newsletter-Tool. Nach rund 30 Sekunden bekommst du einen Score von 0 bis 10 und fünf Prüfpunkte:

| Prüfpunkt | Was geprüft wird |
|---|---|
| **Absender bestätigt** | Darf der Server für deine Domain senden? (SPF) |
| **Mail unterschrieben** | Trägt die Mail eine gültige Unterschrift deiner Domain? (DKIM) |
| **Schutzregel** | Gibt es eine DMARC-Regel, und besteht die Mail sie? (DMARC) |
| **Server-Ruf** | Steht der Server auf einer Sperrliste, hat er einen sauberen Reverse-DNS-Eintrag? |
| **Inhalt** | Wie bewertet ein Spamfilter Betreff und Text? |

Bei jedem Problem siehst du direkt die Anleitung für deinen Anbieter. Den Ergebnis-Link kannst du sieben Tage lang an Kunden oder Kollegen weitergeben.

## Wie Spamfilter entscheiden

Ein Spamfilter entscheidet selten wegen eines einzigen Merkmals. Er sammelt Hinweise und verrechnet sie zu einer Bewertung. Ab einer bestimmten Schwelle landet die Mail im Spam, ab einer höheren wird sie abgelehnt. Grob fließen vier Bereiche ein:

1. **Echtheit:** Bestehen SPF, DKIM und DMARC? Das ist der Bereich, den du am leichtesten selbst reparieren kannst.
2. **Ruf:** Wie verhalten sich der versendende Server und deine Domain bisher? Steht einer von beiden auf einer Sperrliste?
3. **Inhalt:** Sieht die Mail aus wie typischer Spam?
4. **Reaktion der Empfänger:** Öffnen sie deine Mails, antworten sie, oder klicken sie auf „Spam melden“? Google nennt eine Beschwerderate unter 0,3 Prozent als Grenze, die kein Absender überschreiten sollte.

Deshalb kann dieselbe Mail bei einem Empfänger ankommen und beim anderen im Spam landen. Jeder Anbieter gewichtet anders, und jeder kennt deine Domain unterschiedlich gut. Unser Score bildet das vereinfacht nach: Er startet bei 10 und zieht pro Befund Punkte ab, zum Beispiel 2 Punkte für eine fehlende DKIM-Unterschrift oder 1,5 Punkte für eine fehlende DMARC-Regel. So siehst du sofort, welcher Befund am meisten kostet.

## Die häufigsten Ursachen

### 1. SPF, DKIM oder DMARC fehlen

Gmail verlangt seit Februar 2024 von allen Absendern mindestens SPF oder DKIM, von Vielversendern ab 5.000 Mails pro Tag alle drei. Microsoft stellt seit Mai 2025 dieselben Grundanforderungen an Vielversender bei Outlook.com, Hotmail und Live. Spamfilter werten die Signale aber bei allen Absendern aus. Fehlt einer der Nachweise, sinkt das Vertrauen.

**So prüfst du es:** [Testmail an den Mail-Tester](/) oder ohne Mail einzeln mit [SPF-Check](/spf-check), [DKIM-Check](/dkim-check) und [DMARC-Check](/dmarc-check).

**So behebst du es:** Die Grundlagen erklären die Artikel zu [SPF](/wissen/spf), [DKIM](/wissen/dkim) und [DMARC](/wissen/dmarc). Die konkreten Klicks stehen in der [Anleitung für deinen Anbieter](/anleitung).

### 2. Ein Versender fehlt im SPF oder DKIM

Der Klassiker: Mails aus dem Postfach kommen an, Mails aus dem Kontaktformular, dem Shop oder dem Newsletter-Tool landen im Spam. Grund ist fast immer, dass dieser zusätzliche Versender nicht im SPF-Eintrag steht oder nicht mit deiner Domain unterschreibt. Bei IONOS, STRATO, ALL-INKL und Hetzner sind SPF und DKIM für die eigenen Mailserver meist schon eingerichtet. Was fehlt, ist der zweite Absender.

**So prüfst du es:** Schick die Testmail genau aus dem System, das Probleme macht. Beim Kontaktformular also: Formular ausfüllen und die Testadresse als Empfänger eintragen, falls möglich, oder das Formular kurz auf die Testadresse umstellen.

**So behebst du es:** Den Baustein des Dienstes in den bestehenden SPF-Eintrag aufnehmen (nicht einen zweiten Eintrag anlegen) und im Dienst die Domain-Authentifizierung für DKIM einrichten. Ein Kontaktformular verschickt am zuverlässigsten über das echte Postfach (SMTP) statt direkt vom Webserver.

### 3. DKIM bei Google Workspace oder Microsoft 365 nie aktiviert

Beide Anbieter unterschreiben Mails ohne Aktivierung nur mit einer eigenen Domain, nicht mit deiner. DKIM sieht dann bestanden aus, DMARC fällt trotzdem durch.

**So prüfst du es:** Im Testergebnis beim Punkt „Mail unterschrieben“ auf die unterschreibende Domain achten.

**So behebst du es:** [DKIM bei Google Workspace einrichten](/anleitung/google-workspace/dkim) oder [DKIM bei Microsoft 365 einrichten](/anleitung/microsoft-365/dkim).

### 4. Zwei SPF-Einträge oder zu viele Abfragen

Wenn ein neues Tool „seinen“ SPF-Eintrag anlegen lässt, entstehen schnell zwei Einträge. Dann ist SPF komplett ungültig. Ähnlich ist es, wenn der Eintrag mehr als 10 DNS-Abfragen braucht.

**So prüfst du es:** Der [SPF-Check](/spf-check) meldet doppelte Einträge und zählt die Abfragen.

**So behebst du es:** Alles in einen Eintrag zusammenführen, ungenutzte Bausteine streichen. Details im Artikel [SPF-Eintrag einfach erklärt](/wissen/spf).

### 5. Der Server steht auf einer Sperrliste

Sperrlisten (Blacklists) sammeln IP-Adressen und Domains, von denen Spam kam. Steht dein Server drauf, landen deine Mails bei vielen Empfängern im Spam oder werden abgelehnt. Typische Ursachen: ein gehacktes Postfach, ein Kontaktformular, das von Bots missbraucht wird, oder ein günstiger Server, dessen IP-Adresse vorher jemand anderes für Spam genutzt hat. Bei geteilten Servern großer Hoster kann auch ein anderer Kunde der Auslöser sein.

**So prüfst du es:** Der Prüfpunkt „Server-Ruf“ fragt gängige Sperrlisten für genau den Server ab, der deine Testmail verschickt hat. Eine Listung bei Spamhaus kostet im Score 3 Punkte.

**So behebst du es:** Erst die Ursache abstellen (Passwort ändern, Formular mit Spamschutz versehen), dann bei der Sperrliste die Entfernung beantragen. Bei geteilten Servern deines Hosters meldest du die Listung dem Support.

### 6. Kein oder falscher Reverse-DNS-Eintrag

Jeder Mailserver sollte einen Reverse-DNS-Eintrag (rDNS, auch PTR) haben: Die IP-Adresse zeigt auf einen Namen, und dieser Name zeigt wieder auf dieselbe IP-Adresse. Gmail verlangt das von allen Absendern. Bei großen Hostern ist das erledigt. Betroffen sind vor allem eigene Server, etwa ein virtueller Server mit eigenem Mailsystem.

**So prüfst du es:** Prüfpunkt „Server-Ruf“ im Mail-Test.

**So behebst du es:** Den rDNS-Eintrag setzt nicht dein Domain-Anbieter, sondern der Anbieter, dem die IP-Adresse gehört. Bei eigenen Servern findest du die Einstellung meist im Server-Kundenbereich.

### 7. Der Inhalt wirkt verdächtig

Spamfilter bewerten auch Betreff und Text. Typische Minuspunkte:

- Betreff ganz in Großbuchstaben oder mit vielen Ausrufezeichen
- nur ein großes Bild, kaum Text
- Link-Kürzer oder Links, deren Text eine andere Adresse zeigt als das Ziel
- Wörter, die oft in Spam vorkommen, gehäuft auf engem Raum
- Anhänge in Formaten, die oft für Schadsoftware genutzt werden, etwa Archive oder Dateien mit Makros
- fehlender Abmeldelink bei Newslettern (Gmail verlangt für Massenversand eine Abmeldung mit einem Klick)

**So prüfst du es:** Prüfpunkt „Inhalt“ im Mail-Test. Er zeigt dir, welche Merkmale Punkte gekostet haben.

**So behebst du es:** Normal schreiben, Bilder mit Text ergänzen, echte Links verwenden. Der Inhalt ist selten die alleinige Ursache, kippt aber eine knappe Bewertung.

### 8. Die Domain ist neu

Eine Domain, die gerade erst registriert wurde oder noch nie Mails verschickt hat, hat keinen Ruf. Spamfilter sind ihr gegenüber vorsichtig, vor allem wenn sie sofort viele Mails verschickt.

**So behebst du es:** SPF, DKIM und DMARC von Anfang an sauber einrichten und in den ersten Wochen langsam steigern: erst normale Einzelmails, dann größere Aussendungen. Schick die ersten Newsletter an Empfänger, die dich kennen und deine Mails erwarten. Jede Antwort und jede geöffnete Mail baut Vertrauen auf, jede Spam-Meldung kostet es.

### 9. Weiterleitungen

Leitet ein Empfänger deine Mails automatisch an eine andere Adresse weiter, kommt die Mail beim Endziel von einem fremden Server. SPF schlägt dann fehl. Ist DKIM sauber eingerichtet, besteht DMARC trotzdem, weil die Unterschrift die Weiterleitung meist übersteht.

**So behebst du es:** DKIM für alle Versender einrichten. Das ist dein Sicherheitsnetz für alle Fälle, die du nicht selbst in der Hand hast.

## Plötzlich landen alle Mails im Spam?

Wenn es gestern noch ging und heute nicht mehr, hat sich fast immer etwas geändert. Geh diese Fragen durch:

1. **Wurde am DNS gearbeitet?** Anbieterwechsel, neue Website, „Zone zurücksetzen“ oder ein Umzug der Nameserver löschen oft SPF- oder DKIM-Einträge.
2. **Wurde ein neues Tool eingerichtet?** Prüf, ob dabei ein zweiter SPF-Eintrag entstanden ist.
3. **Wurde die DMARC-Regel verschärft?** Von `none` auf `quarantine` oder `reject` macht vergessene Versender schlagartig sichtbar.
4. **Wurde ein Postfach gehackt?** Ungewöhnlich viele gesendete Mails oder Rückläufer sind ein Warnzeichen. Dann folgt oft eine Sperrliste.
5. **Hat der Anbieter etwas geändert?** STRATO zum Beispiel hat 2025 eine Standard-DMARC-Regel für Kunden-Domains eingeführt.

Danach: [Testmail schicken](/), Ergebnis ansehen, die rot markierten Punkte zuerst beheben.

## Eingehende Mails landen in deinem eigenen Spam?

Das ist ein anderes Problem. Hier geht es nicht um deine Domain, sondern um die Einstellungen deines eigenen Postfachs, etwa den Spamfilter deines Anbieters oder Regeln in Outlook. Markiere fälschlich aussortierte Mails als „Kein Spam“ und setz wichtige Absender auf die Liste sicherer Absender. Hilft das nicht, ist der Support deines Postfach-Anbieters die richtige Adresse.

Unser Mail-Tester prüft dagegen die Mails, die **du verschickst**.

## So gehst du jetzt vor

1. [Testmail an den Mail-Tester schicken](/), am besten aus dem System mit dem Problem.
2. Die Prüfpunkte von oben nach unten abarbeiten, Probleme zuerst.
3. Für jeden roten Punkt die verlinkte [Anleitung für deinen Anbieter](/anleitung) öffnen.
4. Nach dem Ändern ein paar Minuten warten und erneut testen.

Wenn du verstehen willst, wie die drei Echtheitsnachweise zusammenhängen, lies den [Überblick SPF, DKIM und DMARC](/wissen/spf-dkim-dmarc).
