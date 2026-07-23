# Prompt della sessione — Visitare

I prompt originali che ho usato, in ordine, raggruppati per fase del metodo **RePPIT**
(Research · Propose · Plan · Implement · Test) — un metodo ideato da
[Mihail Eric](https://themodernsoftware.dev/), che approfondisco su
[vinicius.pm/reppit](https://vinicius.pm/reppit). Sono trascritti verbatim; ho solo
oscurato i riferimenti al mio progetto Supabase privato.

---

## Re · Research
> *Cosa abbiamo davvero tra le mani?*

### 1 · Clona i dati e analizza il dataset

```
Clona https://github.com/vinicius-saraiva/visitare-case-it dentro una sottocartella
`visitare-case-it/`, così resta separata dai miei file.

Poi, prima di costruire o pianificare qualsiasi cosa, facciamo ricerca.

Voglio costruire Visitare: un'app che dà all'ACS due viste sui suoi pazienti — una
lista e una mappa — più una scheda paziente con i suoi dati principali.

Leggi tutto il dataset e scrivi `research.md`, diretto e breve, con:
- cosa possiamo mostrare all'ACS: su di sé, sulla sua équipe, sui suoi pazienti
- i numeri chiave (volumi, distribuzioni, tassi di rischio)
- le lacune di cura che l'app potrebbe chiudere, con i numeri
- le trappole nei dati che ci morderanno quando implementiamo

Usa uv per l'analisi, senza installare dipendenze nel progetto.

Genera anche `mappa-3d.html`: una pagina autonoma con tutti i pazienti su un rilievo
3D reale, colorati per quota. Serve solo a farmi vedere il territorio.
```

---

## P · Propose
> *Cosa costruiamo, tra le opzioni possibili?*

### 2 · Due proposte — prodotto e stack

```
Basandoti su research.md e su riferimenti-ux.md, scrivi due proposte, entrambe
dirette e brevi.

**proposal.md** — la proposta di prodotto per l'MVP di Visitare.
Vincoli già decisi:
- I pazienti di un ACS sono i pazienti della sua équipe.
- Tre schermate: lista, mappa, scheda paziente.
- "Oggi" è il 2 gennaio 2026. Nessun login: un selettore ACS in alto.
Dove ci sono alternative sensate, mettile come opzioni con pro e contro invece di
decidere al posto mio. In particolare: come dare all'ACS un ordine di lavoro —
priorità calcolate dall'app, oppure filtri che sceglie lui.
Le schermate e gli schemi di interazione devono rispettare riferimenti-ux.md:
riportali dentro proposal.md, così il piano poi li eredita.
Includi una sezione "fuori dall'MVP".

**stack-proposal.md** — la proposta tecnica:
- Front-end: 2 opzioni con pro e contro, e la tua raccomandazione.
- Mappa: qualcosa che non richieda API key.
- Back-end: Supabase (il progetto esiste già). I filtri "PS mai ricontattato" e
  "non visitarni" non sono colonne ma join su 260k righe: proponi come
  renderli una query su tabella piatta, tenendo il back-end pronto per la scrittura
  realtime dal giorno in cui ci sarà.
- Hosting: Vercel.
- Segnala cosa manca e cosa ci morderà più avanti.

Non scrivere ancora il piano di implementazione: prima voglio leggere e decidere.
Se hai dubbi che cambiano le proposte, usa AskUserQuestion.
```

### 3 · Revisione — le mie decisioni sulla proposta di prodotto

```
@proposal.md

Voglio che le schermate non siano su un carico già in memoria, ma che vengano sempre da Supabase.

Scelgo l'opzione B - l'acs sceglie con i filtri.

Appuntamenti specialistici, scelgo opzione b, teniamo il 2/1/2026.

Decisione 3 - niente, l'app è read only.

Dopo aver fatto i cambi, aggiorna proposal.md.
```

### 4 · Revisione — il progetto Supabase esiste già

```
@stack-proposal.md

voglio ricordarti che ho già un progetto pronto su supabase coi dati caricati che
potremo utilizzare. https://supabase.com/dashboard/project/<il-mio-progetto>/editor
```

---

## P · Plan
> *In che ordine, e cosa si può parallelizzare?*

### 5 · Il piano

```
Ora il piano. Basandoti su proposal.md e stack-proposal.md aggiornati, scrivi
plan.md: diretto, breve, verificabile.

- includi il comando per creare la sottocartella in cui vivrà il codice
- definisci un "contratto" (il tipo TypeScript della vista di lettura di Supabase)
  che sblocchi il parallelismo tra chi fa la lista e chi fa la mappa
- se ci sono task eseguibili in parallelo da più agenti, esplicitalo, dicendo su
  quali file lavora ciascuno
- Definition of Done in blocchi, verificabile, che includa la prova a 390 px
```

---

## I · Implement
> *Costruiamolo — e mettiamolo online.*

### 6 · Implementa il piano

```
Implementa il piano, se hai bisogno di me, fammi sapere.
```

### 7 · Deploy su Vercel

```
dove sei? voglio pubblicare su vercel!
```

---

## T · Test
> *Funziona davvero, o funziona solo in teoria?*

### 8 · La mappa non funziona — trova la causa

```
La visione mappa non funziona. Quando clicco vado su una mappa tutta in nero. Usa
Claude in Chrome extension per testare se vuoi.
```

---

## 🗂️ Extra

### 9 · Salva i prompt

```
Riesci a copiare tutti i prompt che ho fatto io su questa conversazione su un file
chiamato prompts.md? devono essere i miei prompt originali
```
