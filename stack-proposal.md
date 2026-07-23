# Visitare — proposta tecnica

Accompagna `proposal.md`. Vincoli: **dati sempre da Supabase a ogni interazione**
(niente carico in memoria) · app in **sola lettura** · hosting Vercel ·
l'ACS sceglie con i filtri, nessuna priorità calcolata.

---

## Il progetto Supabase — ispezionato il 22/7

**`Visitare Test 1`** · regione **Canada Central**.

Non è più un'incognita: l'ho letto con la chiave pubblica. C'è tutto, ed è corretto.

| Tabella | Righe | Stato |
|---|---|---|
| `pazienti` | 97.938 | ✅ + 4 colonne di stato già calcolate |
| `visite` | 159.599 | ✅ con chiave primaria `id` |
| `eventi_clinici` | 100.503 | ✅ con chiave primaria `id` |
| `professionisti` | 98 | ✅ |
| `equipe` | 49 | ✅ |
| `app_config` | 1 | ✅ `chiave='oggi'`, `valore='2026-01-02'` |

**`pazienti` porta già lo stato denormalizzato**: `ultima_visita`, `n_visite`,
`ultimo_ps`, `n_ps_12m`. **Ho verificato i valori contro l'analisi pandas e
combaciano esattamente**: 49.100 pazienti con `ultima_visita` non nulla,
14.437 con `ultimo_ps`, 23.959 visitati negli ultimi 90 giorni. Il grosso del
lavoro back-end che la proposta precedente prevedeva **è già fatto.**

### Tre problemi trovati

**1. `n_ps_12m` è una fotografia che scadrà in silenzio.**
Conta gli accessi al PS con `data_riferimento >= 2025-01-03` — cioè una finestra
di 12 mesi congelata attorno all'"oggi" attuale. L'ho verificato: 52 pazienti hanno
un `ultimo_ps` valorizzato e `n_ps_12m = 0`, e sono esattamente quelli con l'ultimo
PS prima del 3/1/2025. Oggi è giusta; **il giorno in cui `app_config.oggi` si
sposta, è muta e sbagliata.** È il caso che `CLAUDE.md` vieta ("*non salvare mai
valori che dipendono da oggi*"). L'MVP non la usi: il conteggio si deriva in
lettura da `eventi_clinici`, o si sostituisce con `n_ps_totale` (indipendente da oggi).

**2. `n_visite` conta anche i duplicati.**
Il massimo è 118, che è il numero *non deduplicato* della mia analisi
(`research.md` §4.3: 2.726 coppie paziente-giorno doppie). Chi ha ricaricato la
tabella non ha deduplicato. Da correggere alla fonte con un
`DISTINCT (professionista_id, registrata_il, paziente_id)`, altrimenti "questo
paziente l'hai visto 118 volte" è falso e visibile all'utente.

**3. Manca la colonna che regge il filtro più importante.**
Non c'è nulla per **"PS non ricontattato"**: né `ps_scoperto_il`, né equivalenti.
È l'unico filtro dell'MVP che richiede ancora un join fra 100.503 eventi e
159.599 visite. Va aggiunto — vedi sotto.

### Cosa manca ancora, in tutto

| Serve per | Cosa aggiungere |
|---|---|
| Filtro "PS non ricontattato" | `pazienti.ps_scoperto_il date` |
| Ordinamento per dislivello | `equipe.sede_quota_m int` — la sede ha lat/lon ma **non la quota**, quindi oggi il dislivello non è calcolabile |
| Correttezza | ricalcolo di `n_visite` deduplicato |
| Igiene | `n_ps_12m` sostituita o ignorata |

---

## La colonna che fa il lavoro: `ps_scoperto_il`

Una `date`: **la data dell'ultimo accesso al PS dopo il quale non risulta nessuna
visita**. `NULL` se il paziente è stato ricontattato o non è mai stato al PS.

Non dipende da "oggi" — è una data. Il filtro diventa
`ps_scoperto_il >= :oggi - 90`, calcolato **in lettura**, esattamente come chiede
`CLAUDE.md`. Il join su 260k righe si fa **una volta**, non a ogni tocco.

Si popola una volta con un backfill e si mantiene con un **trigger** su `visite` e
`eventi_clinici` (non una vista materializzata — `CLAUDE.md`), che ricalcola il solo
paziente toccato. L'app è in sola lettura, quindi oggi il trigger non scatterebbe
mai: si mette adesso perché il giorno in cui arriverà la scrittura non ci sia da
ripensare niente.

**Da validare una volta contro l'analisi:** con `oggi = 2026-01-02`, il filtro a
90 giorni deve restituire **4.074 pazienti**, quello a 30 giorni **1.781**. Se non
tornano, il trigger è sbagliato — ed è un errore che non si vede: mostra
semplicemente meno urgenze del vero.

---

## Il modello di lettura, ora che tutto viene dal server

Ogni schermata è **una query su `pazienti`**, filtrata per `equipe_id`. Nessun
join a runtime: lo stato è già in colonna.

- **Lista** — pagina di ~50, `Range: 0-49`, ordinata per dislivello.
- **Contatori dei chip** — **una sola funzione RPC** che restituisce tutti i
  conteggi insieme. Mai un conteggio per chip: sono otto round trip.
- **Mappa** — proiezione leggera (`select=paziente_id,latitudine,longitudine,quota_m,…`)
  sull'insieme filtrato **completo**, quindi due blocchi da 1.000.
- **Scheda paziente** — una query su `pazienti` + una su `visite` e `eventi_clinici`
  per la timeline (poche decine di righe).

**Indici da creare** — con i filtri sul server non sono più opzionali:
`(equipe_id, quota_m)` per la lista ordinata, e indici parziali su
`equipe_id WHERE ultima_visita IS NULL` e `equipe_id WHERE ps_scoperto_il IS NOT NULL`.

**Il taglio a 1.000 righe è confermato dal vivo**: la risposta su `pazienti` torna
`content-range: 0-999/97938`. La lista pagina e non lo incontra; la mappa sì, e
deve leggere a blocchi.

---

## Front-end

### Opzione 1 — Vite + React + TypeScript (SPA statica)

**Pro**
- Bundle più piccolo: su Android di fascia bassa è la metrica che conta.
- `vite-plugin-pwa` (Workbox) è la strada solida per manifest, service worker e
  guscio offline. La PWA è un requisito di `ux-notes.md`.
- **Una chiamata sola per filtro**: il client parla direttamente a PostgREST.
- Deploy statico su Vercel, zero configurazione.

**Contro**
- Prima schermata bianca finché non arriva il JS (mitigabile con uno skeleton in HTML).
- Routing e stato URL da montare a mano.

### Opzione 2 — Next.js App Router

**Pro**
- **Prima lista renderizzata dal server**: l'ACS vede nomi prima di vedere JS.
  Con i dati non più in cache locale, questo argomento vale più di prima.
- Nativo su Vercel; posto pronto per logica server futura.

**Contro**
- Più JavaScript a bordo per tre schermate.
- **Offline e App Router convivono male**: service worker a mano.
- **Non riduce la latenza dei filtri.** Il percorso diventa
  client → Vercel → Supabase → Vercel → client: un salto in più, non uno in meno.

### Raccomandazione — **ancora Opzione 1, ma con meno margine**

La decisione "sempre dal server" ha rafforzato Next sul primo paint. Non abbastanza:
il costo si paga su **ogni** tocco di filtro, e lì la SPA ha un salto di rete in
meno. Recuperiamo il primo paint con skeleton nell'HTML statico.

**Contorno:** Tailwind + i token già pronti in `brand-system-proposal/`
(`--tocco-min: 44px`, palette, Inter/Bricolage, chiaro e scuro). Niente libreria
di componenti: bastano una decina di componenti nostri.

---

## Mappa — senza API key

**MapLibre GL JS + tessere Protomaps in un `.pmtiles`**, riquadro
Rocinha–Vidigal–São Conrado (~5,4 × 2,2 km), pochi MB, servito da `/public`.

- Nessuna chiave, nessuna quota, nessun terzo che può spegnerci.
- Raggruppamento in cerchi numerati: nativo (`cluster: true`), che è lo schema
  chiesto da `ux-notes.md`.
- Le tessere restano nella cache del service worker: la mappa disegna il territorio
  anche a rete assente — poi dirà che non può caricare i pazienti.

**Alternativa più rapida:** Leaflet + raster OpenStreetMap. Nessuna chiave nemmeno
lì, ma dipende dal server tessere di OSM (la cui policy scoraggia le app), niente
offline, niente stile. Prototipo sì, strada no.

---

## Hosting — Vercel

Build statica, CDN, anteprima per ogni modifica. In ambiente:
`VITE_SUPABASE_URL` e la chiave pubblicabile.

⚠️ **La chiave JWT `anon` legacy non funziona più su questo progetto** — l'ho
verificato, risponde `401 Invalid API key`. Va usata la nuova
`sb_publishable_…`. È il tipo di dettaglio che costa un'ora se lo si scopre
durante l'implementazione.

---

## Cosa ci morderà

**Subito**

- **Il progetto è in Canada Central, l'utente è in Italia.** ~100-130 ms di andata
  e ritorno *prima* di eseguire la query. Con i filtri sul server, ogni tocco costa
  almeno 200-300 ms: siamo esattamente sulla soglia oltre la quale `CLAUDE.md`
  impone un feedback esplicito. Due conseguenze: gli skeleton non sono decorativi,
  e **vale la pena valutare se ricreare il progetto in una regione europea** prima
  di costruirci sopra. È la cosa che rende l'app lenta o accettabile, e si decide
  adesso o mai più.
- **La lettura anonima è aperta su tutte le tabelle** — l'ho verificata leggendo
  97.938 pazienti con la sola chiave pubblica. Per l'esercizio va bene; è da
  scrivere agli atti che chiunque abbia l'URL legge tutto il territorio.
- **`n_visite` sbagliato** e **`n_ps_12m` che scadrà**: due colonne che l'app
  mostrerebbe all'utente in buona fede.

**Dopo**

- **`ps_scoperto_il` è il punto fragile del sistema.** Un trigger sbagliato non
  rompe niente di visibile: mostra meno urgenze. Va confrontato con 4.074/1.781
  ogni volta che si tocca.
- **Il file `.pmtiles` va prodotto** (estrazione da un dump OSM): un passo di
  preparazione dati fuori dal codice dell'app.
- **La quota della sede non esiste** e senza quella l'ordinamento per dislivello
  è finto. Si ricava dai pazienti più vicini alla sede, ma è una derivazione
  nostra, da scrivere una volta e congelare in colonna.
- **Il giorno della scrittura**, `visite` ha già `id` come chiave primaria: serve
  un vincolo di unicità su `(professionista_id, paziente_id, registrata_il)` perché
  il rinvio di una visita non la duplichi. E `pazienti` va messa nella pubblicazione
  `supabase_realtime` perché i due ACS della stessa équipe si vedano a vicenda.
