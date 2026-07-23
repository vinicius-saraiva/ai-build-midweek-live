# Visitare — piano di implementazione

Eredita `proposal.md` (prodotto) e `stack-proposal.md` (tecnica). Non ridiscute
le decisioni: filtri scelti dall'ACS, sola lettura, dati sempre da Supabase,
"oggi" = 2/1/2026, nessun login.

Progetto: `Visitare Test 1` · Canada Central.

---

## Dove vive il codice

```bash
cd /Users/viniciusandrade/Documents/Projects/ai-build-midweek-live && \
npm create vite@latest visitare-app -- --template react-ts && \
cd visitare-app && \
npm install @supabase/supabase-js maplibre-gl && \
npm install -D tailwindcss @tailwindcss/vite vite-plugin-pwa
```

Resta separata da `visitare-case-it/` (dati) e dai tuoi file. Chiavi in
`visitare-app/.env.local`:

```
VITE_SUPABASE_URL=https://<il-tuo-progetto>.supabase.co
VITE_SUPABASE_KEY=<chiave-pubblicabile-sb_publishable_…>
```

> La chiave JWT `anon` legacy risponde `401` su questo progetto: usare la
> `sb_publishable_…`.

---

## Blocco 0 — Database (bloccante, nessun parallelismo)

Va fatto per primo: tutto il resto legge da qui. SQL nell'editor Supabase.

1. **`equipe.sede_quota_m int`** — la sede ha lat/lon ma non la quota, quindi oggi
   il dislivello non è calcolabile. Si deriva dalla mediana dei 15 pazienti più
   vicini a ciascuna sede e si congela:

   | Unità | quota |
   |---|---|
   | CMS Dr Albert Sabin | 190 |
   | CMS Rodolpho Perisse | 117 |
   | CMS Vila Canoas | 48 |
   | CF Avenida Presidente | 34 |
   | CF Largo do Elefante | 17 |
   | CF Maria do Socorro | 54 |
   | CF Pedra Bonita | 74 |
   | CF Rinaldo de Lamare | 9 |
   | CF Rua da Paz | 205 |

2. **`pazienti.sede_quota_m int`** denormalizzata (join **solo su `equipe_id`** —
   `unita_id` è un hash diverso fra le due tabelle e non si joina) e
   **`pazienti.dislivello_m int GENERATED ALWAYS AS (quota_m - sede_quota_m) STORED`**.

3. **`pazienti.ps_scoperto_il date`** — data dell'ultimo `accesso-ps-o-ricovero`
   dopo il quale non risulta nessuna visita; `NULL` se ricontattato o mai al PS.
   Backfill una volta + **trigger** su `visite` e `eventi_clinici` (non vista
   materializzata).

4. **`n_visite` ricalcolata deduplicata** su
   `DISTINCT (professionista_id, registrata_il, paziente_id)`.

5. **`n_ps_12m` ignorata** (dipende da "oggi" e scadrà in silenzio). Non entra nel
   contratto. Se serve un conteggio, `n_ps_totale` indipendente da oggi.

6. **Indici**: `(equipe_id, dislivello_m)`, e parziali su
   `equipe_id WHERE ultima_visita IS NULL` e `equipe_id WHERE ps_scoperto_il IS NOT NULL`.

7. **Vista `v_paziente` e RPC `conteggi_filtri(p_equipe_id, …)`** — vedi contratto.

**Verifica del blocco 0** (numeri dall'analisi, devono tornare esatti):

| Asserzione | Atteso |
|---|---|
| `visite` deduplicate | 156.873 (da 159.599) |
| `max(n_visite)` dopo ricalcolo | **93** (oggi è 118: è il bug) |
| `n_visite > 0` | 49.100 |
| `ps_scoperto_il IS NOT NULL` | 8.059 |
| `ps_scoperto_il >= '2026-01-02'::date - 90` | **4.074** |
| `ps_scoperto_il >= '2026-01-02'::date - 30` | **1.781** |
| `ultima_visita IS NULL` | 48.838 |
| `dislivello_m IS NULL` | 0 |

---

## Blocco 1 — Il contratto (bloccante, sblocca tutto il parallelismo)

Un solo file, scritto e **congelato** prima che parta qualsiasi schermata:
`src/dati/contratto.ts`. Chi fa la lista e chi fa la mappa programmano contro
questo, non contro Supabase.

```ts
// ---- riga della vista v_paziente: l'unica forma in cui i pazienti esistono
export type Paziente = {
  paziente_id: string;
  nome: string; cognome: string;
  fascia_eta: '0-6' | '6-18' | '19-45' | '45-65' | '66+';
  sesso: 'Femminile' | 'Maschile';
  vulnerabilita_sociale: boolean;
  iperteso: boolean; diabetico: boolean; gravidanza: boolean;
  latitudine: number; longitudine: number;
  quota_m: number;
  dislivello_m: number;            // quota_m - quota della sede; negativo = in discesa
  equipe_id: string; equipe_nome: string; area: 'Rocinha' | 'Vidigal' | 'São Conrado';
  sede_latitudine: number; sede_longitudine: number;
  // stato: SEMPRE date, mai "giorni fa". I giorni si derivano in lettura da OGGI.
  ultima_visita: string | null;    // 'YYYY-MM-DD' — null = mai visitato
  n_visite: number;
  ultimo_ps: string | null;
  ps_scoperto_il: string | null;   // null = ricontattato o mai al PS
};

// proiezione leggera per la mappa: stesse chiavi, sottoinsieme
export type PazienteMappa = Pick<Paziente,
  'paziente_id' | 'nome' | 'cognome' | 'latitudine' | 'longitudine'
  | 'quota_m' | 'ps_scoperto_il' | 'ultima_visita'>;

// ---- stato dei filtri: unica fonte di verità, vive nell'URL
export type Filtri = {
  equipe_id: string;
  cerca?: string;
  maiVisitato?: boolean;
  psNonRicontattato?: boolean;     // ps_scoperto_il >= OGGI - 90
  nonVistoDa90?: boolean;
  vulnerabile?: boolean;
  condizioni?: ('iperteso' | 'diabetico' | 'gravidanza')[];
  eta?: Paziente['fascia_eta'][];
  quota?: ('0-50' | '50-100' | '100-150' | '150+')[];
};

// nomi dei parametri URL — congelati: lista e mappa devono leggere lo stesso URL
export const PARAM = {
  equipe_id: 'e', cerca: 'q', maiVisitato: 'mv', psNonRicontattato: 'ps',
  nonVistoDa90: 'nv90', vulnerabile: 'vu', condizioni: 'c', eta: 'a', quota: 'z',
} as const;

export type Contatori = Record<keyof Omit<Filtri, 'equipe_id' | 'cerca'>, number>
  & { totale: number };

export type Pagina<T> = { righe: T[]; totale: number; fine: boolean };
```

E le firme di accesso ai dati, `src/dati/api.ts` — anch'esse congelate:

```ts
export function leggiOggi(): Promise<string>;                       // da app_config
export function leggiEquipe(): Promise<Equipe[]>;
export function leggiProfessionisti(): Promise<Professionista[]>;
export function leggiLista(f: Filtri, pagina: number): Promise<Pagina<Paziente>>;
export function leggiMappa(f: Filtri): Promise<PazienteMappa[]>;    // a blocchi da 1000
export function leggiContatori(f: Filtri): Promise<Contatori>;      // una sola RPC
export function leggiScheda(id: string): Promise<SchedaPaziente>;
```

**Tre invarianti che il contratto impone:**
- Nessun campo "giorni fa" attraversa la rete. Solo date; i giorni si derivano da
  `OGGI` letto da `app_config`.
- `leggiMappa` legge **a blocchi di 1.000** finché la pagina non è più piena
  (PostgREST tronca: `content-range: 0-999/…`, confermato dal vivo).
- `leggiContatori` è **una** chiamata, mai una per chip.

---

## Blocchi 2-5 — In parallelo, quattro agenti

Partono solo dopo che 0 e 1 sono verdi. **Ogni agente possiede i suoi file e non
tocca quelli degli altri.** I file del contratto sono in sola lettura per tutti.

| Agente | Blocco | File posseduti |
|---|---|---|
| **A** | Lista + filtri | `src/schermate/Lista.tsx`, `src/componenti/RigaPaziente.tsx`, `src/componenti/BarraFiltri.tsx`, `src/componenti/FoglioFiltri.tsx`, `src/componenti/Cerca.tsx` |
| **B** | Mappa | `src/schermate/Mappa.tsx`, `src/mappa/*`, `src/componenti/NastroSchede.tsx`, `public/tessere/*` |
| **C** | Scheda paziente | `src/schermate/Scheda.tsx`, `src/componenti/Timeline.tsx`, `src/componenti/Condizioni.tsx` |
| **D** | Guscio + PWA | `src/App.tsx`, `src/componenti/Intestazione.tsx`, `src/componenti/SelettoreACS.tsx`, `src/stato/filtriUrl.ts`, `vite.config.ts`, `public/manifest.*`, icone, `src/stile/*` |

**Dipendenze e attriti da gestire, non da scoprire:**
- `BarraFiltri` e `FoglioFiltri` sono di **A**. **B** li importa e non li modifica:
  se servono modifiche, le chiede ad A.
- `src/stato/filtriUrl.ts` (serializzazione dei `PARAM`) è di **D** e va consegnato
  **per primo**, entro il blocco 1: A e B ci si appoggiano entrambi.
- **B** ha l'unico task con preparazione dati fuori dal codice (estrazione
  `.pmtiles` da un dump OSM sul riquadro Rocinha–Vidigal–São Conrado). Se sfora,
  ripiego dichiarato: Leaflet + raster OSM, perdendo l'offline della mappa.
- **D** possiede i token da `brand-system-proposal/` (palette, Inter/Bricolage,
  `--tocco-min: 44px`, chiaro e scuro). Nessun altro definisce colori.

---

## Definition of Done

Ogni blocco è finito quando **tutte** le sue righe passano. Nessun blocco è "quasi
fatto".

### DoD 0 — Database
- [ ] Le 8 asserzioni della tabella del blocco 0 tornano esatte (query SQL salvata in `sql/verifica.sql`).
- [ ] `ps_scoperto_il` a 90 giorni restituisce **4.074**, a 30 giorni **1.781**.
- [ ] `max(n_visite)` è **93**, non 118.
- [ ] Un `INSERT` di prova in `visite` aggiorna `ultima_visita` e `n_visite` del paziente (trigger vivo), poi rollback.
- [ ] `app_config` resta l'unico posto in cui compare la data 2026-01-02: `grep -r "2026-01-02" src/` non trova nulla.

### DoD 1 — Contratto
- [ ] `npx tsc --noEmit` pulito.
- [ ] `src/dati/contratto.ts` e `src/dati/api.ts` non cambiano più: ogni modifica successiva è una rinegoziazione esplicita, non un commit.
- [ ] `leggiMappa` su un'équipe intera restituisce **1.996–2.000 righe**, non 1.000. *(È il test che smaschera la paginazione mancante.)*
- [ ] `grep -rE "giorni|days" src/dati/` non trova campi trasmessi: solo date.

### DoD 2 — Lista
- [ ] Filtri azzerati su Equipe Valão → **1.998** pazienti, prima pagina 50 righe.
- [ ] "Mai visitato" → il contatore del chip coincide con il totale della lista.
- [ ] I 7 chip stanno su **una riga sola** che scorre in orizzontale. Zero impilamento.
- [ ] I fogli a scelta multipla applicano solo su *Applica*: con la rete a 3G simulata, N tocchi = **1** richiesta.
- [ ] Ricerca "Maria": una sola richiesta 350 ms dopo l'ultima lettera.
- [ ] Ogni riga porta nome + età + quota (l'81% dei pazienti ha un omonimo).
- [ ] Ordinamento per `dislivello_m` crescente, verificabile a occhio sulle prime righe.
- [ ] Ogni attesa > 200 ms ha skeleton e testo con `aria-live`.

### DoD 3 — Mappa
- [ ] Stesso URL della lista → stesso insieme di pazienti. Copiare l'URL da lista a mappa non ricompone i filtri.
- [ ] A zoom largo: cerchi numerati, non 2.000 pin.
- [ ] Nessuna chiave API in tutto il codice: `grep -riE "api[_-]?key|token" src/` pulito a parte le variabili Supabase.
- [ ] Toccare un punto apre il nastro di schede staccato dal bordo; scorrendo il nastro la mappa segue.
- [ ] Inquadratura calcolata sui punti reali: verificata su **Equipe Estrada da Gávea** (raggio 1.576 m) e su un'équipe compatta della Rocinha.
- [ ] Lo stato non è mai solo colore: pin con forma o icona oltre alla quota.

### DoD 4 — Scheda paziente
- [ ] Le 7 sezioni di `proposal.md` presenti e nell'ordine.
- [ ] Dice **"ultimo appuntamento"**, mai "prossimo".
- [ ] "Mai visitato" scritto in chiaro, mai un trattino.
- [ ] Timeline unica, visite ed eventi in ordine di data.
- [ ] Su un paziente con `n_visite` alto il numero è **93 o meno**.

### DoD 5 — Guscio e PWA
- [ ] Installabile: manifest valido, icone, avvio a schermo intero senza barra del browser.
- [ ] A rete spenta l'app **si apre** e dice esplicitamente che non può caricare i pazienti (non una schermata bianca).
- [ ] Selettore ACS: foglio dal basso con ricerca. **Zero `<select>` nel codice**: `grep -r "<select" src/` pulito.
- [ ] Intestazione **massimo 2 righe**, senza numeri già presenti nei contatori dei filtri.
- [ ] `grep -r "backdrop-blur" src/` pulito.

### DoD 6 — La prova a 390 px
Su viewport **390 × 844**, con la CPU rallentata 4× e la rete a *Fast 3G*:

- [ ] **Nessuno scorrimento orizzontale** su nessuna delle tre schermate.
- [ ] **Tutte le aree di tocco ≥ 44 px** — misurate, non stimate.
- [ ] Il pulsante flottante non copre l'ultima riga della lista quando è in fondo.
- [ ] Con la barra filtri visibile restano **almeno 4 righe** di pazienti sullo schermo.
- [ ] Nessuna schermata bianca > 1 s: dopo il primo paint c'è sempre uno skeleton.
- [ ] Le tre schermate sono leggibili in tema chiaro **e** scuro.
- [ ] Screenshot delle tre schermate a 390 px allegati come prova.

> La prova va eseguita nel browser con la Claude Chrome Extension. Come da
> `CLAUDE.md`, **te la chiedo prima di lanciarla** invece di verificare da solo.

### DoD 7 — Deploy
- [ ] Build su Vercel, URL di anteprima aperto dal telefono.
- [ ] Le chiavi sono variabili d'ambiente, non nel sorgente.
- [ ] Prima lista visibile in < 3 s da rete mobile italiana. *(Se non ci arriva, il sospetto numero uno è la regione Canada Central — vedi sotto.)*

---

## Da decidere prima di partire

1. **La regione del progetto.** Canada Central, utente in Italia: ~100-130 ms di
   round trip prima di eseguire la query, e con i filtri sul server ogni tocco
   costa 200-300 ms. Ricreare il progetto in Europa si fa adesso o mai più.
   Il piano funziona in entrambi i casi; cambia solo quanto sarà piacevole.
2. **Ordinamento per dislivello: con segno o assoluto?** Il piano assume **con
   segno, crescente** (prima chi sta più in basso della sede). L'alternativa è il
   valore assoluto (prima chi sta più vicino di quota, in su o in giù).
3. **La lettura anonima è aperta su tutte le tabelle.** Per l'esercizio va bene.
   Se non va bene, è un blocco 0-bis.
