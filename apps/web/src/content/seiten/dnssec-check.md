---
titel: "DNSSEC-Check: Wie gut ist dein Postfach geschützt?"
seoTitel: "DNSSEC Check: DNSSEC, DANE und MTA-STS kostenlos prüfen"
beschreibung: "Domain eingeben und sofort sehen, ob DNSSEC, DANE, MTA-STS und TLS-RPT eingerichtet sind. Kostenlos, ohne Konto, in Klartext erklärt."
keyword: "dnssec check"
intro: "Gib deine Domain ein und sieh sofort, ob ihre DNS-Einträge signiert sind und ob Mails an dich nur verschlüsselt ankommen dürfen. Geprüft werden DNSSEC, DANE, MTA-STS und TLS-RPT. Ohne Testmail, ohne Konto."
faq:
  - frage: "Wie prüfe ich, ob DNSSEC aktiv ist?"
    antwort: "Gib deine Domain oben ein. Wir fragen ihre Einträge über einen Resolver ab, der DNSSEC selbst prüft. Ist die Antwort gültig signiert, ist DNSSEC aktiv. Fehlt die Signatur, steht dort „nicht signiert“."
  - frage: "Was ist der Unterschied zwischen DANE und MTA-STS?"
    antwort: "Beide sorgen dafür, dass Mails an dich nur verschlüsselt übertragen werden. DANE legt das passende Zertifikat im DNS fest und braucht dafür DNSSEC. MTA-STS funktioniert ohne DNSSEC über einen DNS-Eintrag und eine kleine Textdatei auf einer Subdomain. Google und Microsoft beachten MTA-STS beim Versand."
  - frage: "Brauche ich DNSSEC, damit meine Mails ankommen?"
    antwort: "Nein. Gmail und Microsoft verlangen SPF, DKIM und DMARC, aber kein DNSSEC. DNSSEC, DANE und MTA-STS schützen die Mails, die an dich gehen, vor Fälschung und Mitlesen. Deshalb gibt es dafür in unserem Mail-Test auch keine Punkte."
  - frage: "Was ist TLS-RPT?"
    antwort: "TLS-RPT ist ein DNS-Eintrag, mit dem andere Mailserver dir Berichte schicken, ob die verschlüsselte Zustellung an dich klappt und wo sie scheitert. Er ist der einfachste der vier Schritte: ein einziger TXT-Eintrag unter _smtp._tls."
  - frage: "Kann ich DANE selbst einrichten?"
    antwort: "Nur wenn du deine Mailserver selbst betreibst. Den TLSA-Eintrag legt an, wer den Mailserver-Namen verwaltet. Bei gehosteter Mail, etwa bei IONOS, Google Workspace oder Microsoft 365, liegt das beim Anbieter."
stand: "2026-10-23"
---

## Was prüft der DNSSEC-Check?

SPF, DKIM und DMARC sorgen dafür, dass deine Mails ankommen. Die vier Prüfungen hier gehen in die andere Richtung: Sie schützen die Mails, die **an** deine Domain geschickt werden, davor, dass jemand sie umleitet oder mitliest.

| Prüfung | Was sie bewirkt |
|---|---|
| **DNSSEC** | Deine DNS-Einträge sind digital signiert. Niemand kann sie unterwegs fälschen. |
| **DANE** | Andere Mailserver wissen vorab, welches Zertifikat deine Mailserver haben. Braucht DNSSEC. |
| **MTA-STS** | Deine Domain verlangt verschlüsselte Zustellung, auch ohne DNSSEC. |
| **TLS-RPT** | Du bekommst Berichte, ob die verschlüsselte Zustellung an dich klappt. |

Keine der vier ist Pflicht. Für Firmen, die vertrauliche Unterlagen per Mail bekommen (Angebote, Bewerbungen, Verträge), lohnt sich aber jede einzelne.

## DNSSEC: signierte DNS-Einträge

Wenn ein Mailserver eine Mail an dich zustellen will, fragt er im DNS nach deinem Mailserver (MX-Eintrag). Ohne DNSSEC kann ein Angreifer diese Antwort im Prinzip fälschen und die Mail zu sich umleiten. Mit DNSSEC ist jede Antwort signiert, eine gefälschte fällt sofort auf.

Unser Check fragt deine Domain über einen eigenen Resolver ab, der DNSSEC selbst prüft. Nur wenn die Signatur gültig ist, zeigen wir „signiert“.

Bei vielen Anbietern ist DNSSEC ein einzelner Schalter in den Domain-Einstellungen. Liegt deine Domain bei einem Anbieter und der DNS bei einem anderen, muss der DNS-Anbieter signieren und der Domain-Anbieter den Schlüssel an die Registrierungsstelle weitergeben.

## DANE: das richtige Zertifikat festlegen

Mailserver verschlüsseln untereinander meist schon. Das Problem: Bisher kann ein Angreifer die Verschlüsselung oft einfach unterdrücken, und die Mail geht dann unverschlüsselt durch. DANE verhindert das. Im DNS steht ein TLSA-Eintrag, der sagt, welches Zertifikat dein Mailserver hat. Ein Server, der DANE beachtet, schickt nur verschlüsselt an genau dieses Zertifikat.

Der Eintrag liegt unter `_25._tcp.` plus dem Namen deines Mailservers, zum Beispiel:

```
_25._tcp.mail.deine-domain.de  TLSA  3 1 1 <Prüfsumme des Zertifikats>
```

DANE zählt nur, wenn die Zone signiert ist. Ohne DNSSEC könnte ja auch der TLSA-Eintrag gefälscht sein. Deshalb zeigen wir einen TLSA-Eintrag ohne Signatur als „zählt nicht“ an.

## MTA-STS: Verschlüsselung ohne DNSSEC

MTA-STS löst dasselbe Problem wie DANE, braucht aber kein DNSSEC. Es besteht aus zwei Teilen:

1. Ein TXT-Eintrag unter `_mta-sts`, der eine Regel ankündigt:

```
v=STSv1; id=20261023
```

2. Eine kleine Textdatei unter `https://mta-sts.deine-domain.de/.well-known/mta-sts.txt`, die sagt, welche Mailserver gültig sind und wie streng die Regel ist:

```
version: STSv1
mode: enforce
mx: mail.deine-domain.de
max_age: 604800
```

Fang mit `mode: testing` an. Dann bekommst du Berichte (siehe TLS-RPT), ohne dass Mails abgewiesen werden. Wenn alles passt, stellst du auf `enforce` um.

Unser Check liest den TXT-Eintrag. Die Textdatei rufen wir bewusst nicht ab, genau wie wir Links in Testmails nie aufrufen.

## TLS-RPT: Berichte über Probleme

TLS-RPT ist der einfachste Schritt und der beste Einstieg. Ein einziger TXT-Eintrag unter `_smtp._tls`, und große Mailserver wie Google und Microsoft schicken dir täglich einen Bericht, wie die verschlüsselte Zustellung an dich lief, mit allen Fehlern:

```
v=TLSRPTv1; rua=mailto:tls-berichte@deine-domain.de
```

Ersetze die Adresse durch ein Postfach, das es gibt. Die Berichte kommen als JSON-Datei, oft als Anhang. Sie sind vor allem wichtig, solange du MTA-STS im Testmodus hast.

## Und was ist mit SPF, DKIM und DMARC?

Die sind wichtiger, wenn es darum geht, dass deine eigenen Mails ankommen. Prüf sie mit dem [SPF-Check](/spf-check), dem [DKIM-Check](/dkim-check) und dem [DMARC-Check](/dmarc-check), oder schick eine echte Mail an unseren [Mail-Test](/). Der zeigt die vier Werte von dieser Seite übrigens auch, ganz unten unter „Für Nerds“, ohne dass sie Punkte kosten.
