# Schriften (eigene Teilmengen)

Die fontsource-Dateien waren 115 KB für Fraunces und Inter. Hier liegen Teilmengen mit nur dem, was die Seite nutzt.

| Datei | Quelle | Achsen | Größe |
|---|---|---|---|
| `fraunces-680-latin.woff2` | `@fontsource-variable/fraunces` `fraunces-latin-opsz-normal.woff2` | fest wght 680, opsz 24–72 (optische Größe bleibt wie im Original) | 31 KB |
| `inter-400-700-latin.woff2` | `@fontsource-variable/inter` `inter-latin-wght-normal.woff2` | wght 400–700 | 26 KB |

Zeichen: `U+0020-007E, U+00A0-00FF, U+0131, U+0152-0153, U+02C6, U+02DA, U+02DC, U+2010-2027, U+2030, U+2039-203A, U+20AC, U+2122, U+2190-2193, U+2212, U+00B7, U+2713` (Latein, Umlaute, ß, Anführungszeichen, Striche, €, Pfeile, Haken).

Neu bauen (fonttools mit brotli):

```bash
fonttools varLib.instancer fraunces-latin-opsz-normal.woff2 wght=680 opsz=24:72 -o fr.ttf
pyftsubset fr.ttf --unicodes="<Liste oben>" --layout-features='kern,liga,calt,lnum,tnum,ccmp,locl,mark,mkmk' --flavor=woff2 --output-file=fraunces-680-latin.woff2
fonttools varLib.instancer inter-latin-wght-normal.woff2 wght=400:700 -o in.ttf
pyftsubset in.ttf --unicodes="<Liste oben>" --layout-features='kern,liga,calt,tnum,ccmp,locl,mark,mkmk,case' --flavor=woff2 --output-file=inter-400-700-latin.woff2
```

Lizenz: beide SIL Open Font License 1.1 (Fraunces: Undercase Type, Inter: Rasmus Andersson), Teilmengen sind erlaubt.
