# Asset di marca — Visitare

Simbolo: **segnaposto abitato**. Colori: Blu Servizio `#14507A`, Carta `#F7F5F1`.
Guida completa: [`../brand-system-proposal/index.html`](../brand-system-proposal/index.html).

## Quale file usare

| Serve | File |
|---|---|
| Logo nell'app, ovunque possibile | `logo/visitare-pin.svg` |
| Logo su fondo blu o scuro | `logo/visitare-pin-negativo.svg` |
| Logo in nero (stampa, documenti) | `logo/visitare-pin-inchiostro.svg` |
| Icona con fondo blu (app, avatar) | `logo/visitare-badge.svg` |
| Logo + nome, orizzontale | `logo/visitare-lockup.svg` · PNG: `visitare-lockup.png` |
| Logo + nome su fondo blu | `logo/visitare-lockup-negativo.png` |
| Anteprima social / link condivisi | `logo/visitare-og.png` (1200×630) |
| Favicon | `favicon/favicon.svg` + `favicon-16/32/48.png` |
| Icona iOS (apple-touch-icon) | `logo/visitare-badge-180.png` |
| Icona PWA / Android | `logo/visitare-badge-192.png` · `visitare-badge-512.png` |

I PNG del pin (`visitare-pin-16…1024.png`) hanno **fondo trasparente**.

## In Next.js

```
app/icon.svg          ← favicon/favicon.svg
app/apple-icon.png    ← logo/visitare-badge-180.png
app/opengraph-image.png ← logo/visitare-og.png
```

Next.js genera da solo i tag `<link>` e `<meta>` a partire da questi nomi di file.

## Attenzione

- **Il lockup SVG usa il testo, non i tracciati**: fuori dall'app, dove il font
  *Bricolage Grotesque* non è caricato, il nome viene reso con un carattere di ripiego.
  Per slide, PDF e materiali esterni usare il **PNG**, che ha il carattere già inciso.
- Il pin **non** è anche il marcatore della mappa: lì i pin sono dati, qui è la marca.
- Un solo colore, sempre: la persona è un vuoto, mai un secondo colore.

## Rigenerare i PNG

Sono renderizzati da Chrome headless a partire dagli SVG e dal webfont
(script nella scratchpad di sessione, non versionato). Per rifarli basta ri-renderizzare
gli SVG di questa cartella alle stesse dimensioni.
