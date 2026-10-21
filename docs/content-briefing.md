# Briefing für alle Texte auf e-mail-check.de

Verbindlich für jeden, der Inhalte schreibt (Mensch oder Agent). Quelle der Wahrheit für Keywords, Titles und Gliederungen: `research/seo-strategie.md`. Für Anbieter-Fakten: `research/anbieter-quellen.md`.

## Ton
- Du-Ansprache, Klartext zuerst, Fachbegriff dahinter oder klein darunter. Zielgruppe: Webdesigner, Agenturen, Selbstständige ohne Mail-Fachwissen.
- Kurze Absätze (2 bis 4 Sätze), aktive Sätze, konkrete Verben.
- **Kein Em-Dash „—“ und kein Halbgeviertstrich „–“ als Gedankenstrich.** Stattdessen Punkt, Komma oder Doppelpunkt. Normaler Bindestrich nur in Wörtern („DNS-Eintrag“).
- Keine Floskeln („In der heutigen digitalen Welt …“), keine Übertreibungen, keine Emojis.
- Der erste Absatz beantwortet die Suchfrage in 2 bis 3 Sätzen (wird auch als `kurz`/`kurzantwort`/`intro` im Frontmatter gepflegt und vom Layout groß angezeigt, im Body NICHT wiederholen).

## Fakten
- Nichts erfinden. Menüpfade, Standardwerte, Selektoren und Eigenheiten nur aus `research/anbieter-quellen.md` oder den dort verlinkten offiziellen Quellen (darfst du per WebFetch nachlesen). Wenn etwas unklar ist: allgemein formulieren und den Punkt in `offenePunkte` eintragen.
- Gmail-Anforderungen gelten seit Februar 2024, Outlook.com/Microsoft seit Mai 2025 (für Vielversender ab 5.000 Mails pro Tag; Spamfilter werten die Signale aber bei allen Absendern).
- Beispiel-Domain in Texten: `deine-domain.de`. Beispiel-IP: `203.0.113.10`.

## Unser Tool (darauf verlinken, so beschreiben)
- `/` Mail-Test: Testmail an eine Adresse wie `k7m2x9qa@test.e-mail-check.de` schicken → nach ca. 30 Sekunden Score 0 bis 10, Ampel und 5 Prüfpunkte:
  - **Absender bestätigt** (SPF) · **Mail unterschrieben** (DKIM) · **Schutzregel** (DMARC) · **Server-Ruf** (Sperrlisten, rDNS) · **Inhalt** (Spamfilter-Score)
  - Bei Problemen direkt die Anleitung für den eigenen Anbieter. Ergebnis als Link teilbar (7 Tage), Server in Deutschland, Mail-Inhalt wird sofort nach der Prüfung gelöscht, kein Konto, kostenlos.
  - Score-Logik transparent: Start bei 10, Abzüge pro Befund (z. B. kein DMARC −1,5, keine DKIM-Signatur −2, Spamhaus-Listung −3).
- `/spf-check`, `/dkim-check`, `/dmarc-check`: Domain eingeben, Ergebnis ohne Testmail. Der DKIM-Check sucht ohne Selektor automatisch nach verbreiteten Selektoren (u. a. default, selector1, selector2, google, s1-ionos, s2-ionos, k1, mail).
- Anleitungen: `/anleitung`, `/anleitung/<anbieter>/<thema>` mit anbieter ∈ ionos, strato, all-inkl, microsoft-365, google-workspace und thema ∈ spf, dkim, dmarc; Hetzner: `/anleitung/hetzner/spf-dkim-dmarc`.
- Wissen: `/wissen/spf`, `/wissen/dkim`, `/wissen/dmarc`, `/wissen/spf-dkim-dmarc`, `/wissen/mails-landen-im-spam`.

## Format (Astro Content Collections, Schema: `apps/web/src/content.config.ts`)
- Markdown-Body beginnt mit `##` (die H1 kommt aus `titel`). Keine H1 im Body.
- Interne Links als absolute Pfade (`/wissen/dmarc`), beschreibende Ankertexte, nie „hier“.
- DNS-Werte immer als Codeblock ohne Sprache (das Layout macht einen Kopieren-Button daraus). Platzhalter-Domain `deine-domain.de`.
- Tabellen in Markdown sind erlaubt.
- **Nicht in den Body schreiben** (macht das Layout automatisch): Tool-CTA-Kästen, FAQ, Quellen, „Geprüft am“, Breadcrumbs, verwandte Links am Ende. Inline-Links zum Tool im Text sind erwünscht.
- FAQ: 3 bis 6 Fragen im Frontmatter `faq` (echte Suchfragen aus der Strategie), Antworten 2 bis 4 Sätze, reiner Text.
- `stand: "2026-10-21"`.
- Längen laut Strategie.
- Titles/Descriptions aus der Strategie übernehmen (Längen: Title ≤ 60, Description ≤ 155 Zeichen; nachzählen).
