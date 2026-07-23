# Visitare — proposta di prodotto (MVP)

Basata su `research.md` (i numeri) e `ux-notes.md` (gli schemi di interazione).

---

## Il problema, in tre numeri

Un ACS ha **~2.000 pazienti** in carico (l'équipe intera, condivisa con un collega).

- **~1.028 non sono mai stati visitati.** Metà del carico.
- **~78 sono passati dal pronto soccorso negli ultimi 90 giorni e nessuno li ha
  richiamati.** Di questi ~35 negli ultimi 30 giorni.
- **~1.540 non ricevono una visita da più di 90 giorni.**

L'app non gli dice che ha tanto lavoro: gli dà **gli strumenti per ritagliare, in
piedi e con una mano, il pezzo di territorio che vuole fare stamattina.**

## Cosa costruiamo

Tre schermate — lista, mappa, scheda paziente — in **sola lettura**, su dati che
arrivano **sempre da Supabase**.

---

## Decisioni prese

| | |
|---|---|
| **Carico dell'ACS** | I pazienti della sua équipe (~2.000) |
| **"Oggi"** | 2 gennaio 2026, da `app_config`, un solo punto |
| **Identità** | Nessun login. Selettore ACS in alto |
| **Ordine di lavoro** | **L'ACS sceglie con i filtri.** Nessuna priorità calcolata, nessun punteggio, nessun filtro preconfezionato acceso all'avvio |
| **Appuntamenti specialistici** | Restiamo al 2/1/2026. La scheda dice **"ultimo appuntamento"**, mai "prossimo": nei dati non esiste nulla nel futuro (`research.md` §4.2) |
| **Scrittura** | Nessuna. L'app è in sola lettura |
| **Dati** | **Sempre da Supabase, a ogni interazione.** Niente carico tenuto in memoria |

### Due conseguenze da accettare a occhi aperti

**1. Con i filtri azzerati la lista è ~2.000 nomi.** È il costo dichiarato di
lasciare la scelta all'ACS: l'app non decide da chi cominciare. Tre attenuazioni
che restano dentro questa scelta, senza reintrodurre priorità:

- **I filtri dell'ultima sessione si riaprono** (stato nell'URL, più un ricordo
  locale dell'ultimo URL usato). Al secondo giorno l'app si apre già sul suo modo
  di lavorare.
- **I contatori sui chip fanno il lavoro dell'urgenza**: `PS non ricontattato 78`
  è visibile senza attivare niente. Un numero su un chip non è una priorità
  imposta, è un'informazione.
- **L'ordinamento di default è il dislivello dalla sede**, l'unica cosa che l'ACS
  non può calcolare a mente.

Resta scoperto — e lo mettiamo agli atti — che **i ~35 pazienti passati dal PS
senza richiamo restano invisibili finché l'ACS non tocca quel chip.**

**2. Ogni tocco di filtro è una richiesta di rete.** Questo cambia tre cose:

- **La regola dei 200 ms diventa il cuore dell'app**, non una rifinitura. Ogni
  filtro, ogni pagina, ogni ricerca ha skeleton e testo con `aria-live`.
- **La bozza + *Applica* nei fogli a scelta multipla non è più uno stile: è
  obbligatoria.** Senza, tre tocchi in un foglio sono tre round trip su rete mobile.
- **La lista è paginata** (~50 per pagina, scorrimento infinito). 2.000 righe non
  si spediscono a un Android di fascia bassa, e PostgREST tronca comunque a 1.000.

> **Nota di coerenza:** `CLAUDE.md` dice "*cache in memoria, non rileggerli a ogni
> filtro*". Questa proposta lo contraddice per scelta esplicita del 22/7. Se la
> decisione regge, quella riga di `CLAUDE.md` va aggiornata, altrimenti tornerà
> fuori come un errore.

---

## Le schermate

Gli schemi qui sotto sono quelli di `ux-notes.md`, riportati per intero perché il
piano di implementazione li erediti senza rileggere altro.

### Regole valide su tutte e tre

| Elemento | Scelta | Perché |
|:---|:---|:---|
| Filtri | Una riga orizzontale scorrevole + foglio dal basso | Tre righe di chip mangiano mezzo schermo |
| Filtri a scelta multipla | Bozza + pulsante *Applica* | Su rete lenta, evita una richiesta a ogni tocco |
| Azione principale | Pulsante flottante in basso a destra | Non ruba una riga di lista |
| Selettore ACS (98 nomi) | Foglio dal basso **con ricerca** | Il menu nativo Android con 98 voci è inservibile |
| Intestazione | Massimo 2 righe | Deve restare spazio ai pazienti |
| Stato dei filtri | Nell'URL | Sopravvive a lista ⇄ mappa, si manda a un collega |
| Ricerca per nome | Attesa di 350 ms dopo l'ultima lettera | Evita una richiesta per carattere |
| Area di tocco | Minimo 44 px | Si usa in piedi, con una mano |
| Attese oltre 200 ms | Skeleton o testo con `aria-live` | Non deve chiedersi se ha funzionato |
| Stati | Mai il colore da solo | Icona o etichetta sempre accanto |

**Progettare a 390 px e verificare a 390 px.** Niente `backdrop-blur`, niente
animazioni elaborate: il telefono è lento.

**Nasce installabile (PWA):** manifest, icone, avvio a schermo intero senza barra
del browser, e una cache che permetta all'app di **aprirsi** anche con la rete che
va e viene. Attenzione: i dati arrivano sempre dalla rete, quindi la cache serve
al guscio dell'app, non ai pazienti. Senza rete, l'app si apre e dice che non può
mostrare la lista.

### Schermata 1 — Lista

```
┌─────────────────────────────┐
│ Visitare      Ana Ribeiro ▾ │  ← selettore ACS (foglio con ricerca)
│ Equipe Valão · 1.998        │  ← max 2 righe, niente numeri ripetuti
├─────────────────────────────┤
│ 🔍 Cerca per nome           │
├─────────────────────────────┤
│ [Mai visitato 1028] [PS 78] │  ← UNA riga, scorre in orizzontale
├─────────────────────────────┤
│ Maria Souza · 71 anni       │
│ Mai visitata · PS il 18/12  │
│ 128 m · +52 m dalla sede    │
├─────────────────────────────┤
│ …                      ⊕ 📍 │  ← flottante: "vedi sulla mappa"
└─────────────────────────────┘
```

- **Ogni riga disambigua l'omonimo**: l'81% dei pazienti condivide nome e cognome
  (fino a 13 persone identiche, `research.md` §4.6). Nome **+ età + quota** sempre.
- **Contatore su ogni chip.** Con i dati sul server i contatori non sono gratis:
  vanno presi **tutti insieme, in una sola chiamata** accanto alla pagina di
  risultati, mai un conteggio per chip.
- **"Mai visitato" è uno stato di prima classe**, non un trattino: riguarda metà
  del territorio.
- **Ordinamento: dislivello dalla sede.** Tutto sta entro 400 m; quello che cambia
  la giornata è che il Vidigal sta 100 m più in alto. (Limite noto: è un ordine
  valido a inizio giornata, non mentre cammina.)
- **Scorrimento infinito**, ~50 pazienti per pagina, con skeleton in coda.

**I filtri, con la loro taglia reale per équipe** (mediana, e min–max fra le 49):

| Chip | Tipo | Pazienti |
|---|---|---|
| Mai visitato | interruttore | 1.028 (447–1.312) |
| PS non ricontattato | interruttore | 78 (24–218) |
| Non visto da >90 gg | interruttore | 1.540 |
| Condizioni | foglio, multipla | iperteso 459 · diabetico · gravidanza 13 |
| Età | foglio, multipla | 66+ → 612 (185–777) |
| Vulnerabilità | interruttore | 131 (10–664) |
| Quota | foglio, multipla | 0-50 / 50-100 / 100-150 / 150+ |

I filtri si combinano in AND. Il chip attivo mostra il conteggio del risultato
corrente, non del totale.

### Schermata 2 — Mappa

- **Stessi filtri della lista, stesso stato URL.** Passare da una all'altra non
  ricompone niente.
- **La mappa non si pagina.** Mentre la lista scorre a pagine, la mappa chiede al
  server **l'insieme filtrato completo in proiezione leggera** — solo id,
  latitudine, longitudine, quota e stato. Fino a ~2.000 punti, quindi due blocchi
  da 1.000. È una chiamata diversa da quella della lista: va progettata come tale.
- **Pin colorati per quota** (rampa a un solo tono, chiaro→scuro) **+ forma o
  icona per lo stato**: mai il colore da solo.
- **Raggruppamento in cerchi numerati a zoom largo** — modello Google Maps, invece
  di duemila pin sovrapposti.
- **Nastro di schede in basso, staccato dal bordo** — modello Wellhub: si tocca un
  punto, compare la scheda; le schede scorrono in orizzontale e la mappa segue la
  selezione; si tocca la scheda e si apre il dettaglio.
- **Inquadratura sui punti reali, mai su un raggio fisso**: i territori vanno da
  35 m a 1.576 m di raggio (`research.md` §4.8).
- La sede UBS è sempre visibile: è il punto da cui parte la giornata.

### Schermata 3 — Scheda paziente

Una sola richiesta al server per paziente, un solo schermo scorrevole:

1. **Nome, età, sesso** — e la quota, che qui serve a confermare "è questa Maria".
2. **Condizioni** — iperteso · diabetico · gravidanza · vulnerabilità, come
   etichette con icona.
3. **Giorni dall'ultima visita** e numero di visite. "Mai visitato" in chiaro.
4. **Accessi al pronto soccorso** — quanti, e quando l'ultimo.
5. **Ultimo appuntamento specialistico** — al passato, mai "prossimo".
6. **Una sola timeline** che unisce visite ACS ed eventi clinici in ordine di data.
   È la parte che dà senso al resto: si vede il PS a dicembre e il vuoto dopo.
7. Pulsante verso la mappa centrata su di lei.

> Attenzione: **non esiste un indirizzo nei dati** — solo latitudine, longitudine
> e quota. La scheda non può dire "via X n. 12". Vedi *Cosa manca*.

---

## Fuori dall'MVP

Elencate perché siano decise adesso di non farle, non dimenticate.

- **Qualsiasi priorità calcolata dall'app**: punteggi di rischio, ordinamento per
  urgenza, filtri preconfezionati accesi all'avvio. Scelta di prodotto, non
  mancanza di tempo.
- **Itinerario ottimizzato della giornata.** I dati contengono percorsi reali
  ordinati per dislivello ed è la cosa più affascinante del dataset — ed è anche
  un problema di ottimizzazione che si mangia l'intero MVP. L'MVP ordina, non instrada.
- **Qualsiasi scrittura**: "segna visita", esiti, note. E quindi anche la coda
  offline e la sincronizzazione.
- **Dati consultabili senza rete.** La PWA garantisce che l'app si apra, non che
  mostri i pazienti.
- **Login e identità reale.** Il selettore ACS è dichiarativo. Nessun dato è
  protetto: da chiudere prima di qualsiasi uso vero.
- **Vista di squadra / cruscotto del coordinatore.** L'app è dell'ACS, in piedi.
  Una dashboard da scrivania è un altro prodotto.
- **Notifiche push.**
- **Rilievo 3D dentro l'app.** `mappa-3d.html` resta uno strumento per capire il
  territorio, non una schermata.
- **Modifica dei dati anagrafici del paziente.**

## Cosa manca, e ce ne accorgeremo tardi

- **Nessun indirizzo.** L'ACS naviga a coordinate. In un territorio senza
  toponomastica regolare è probabilmente realistico, ma la scheda paziente ne esce
  più povera di quanto ci aspettiamo. Da verificare con te se è accettabile.
- **Nessun esito di visita**: non sappiamo se una visita è andata a buon fine, se
  il paziente era in casa, se ha rifiutato. "Visitato" è l'unico stato.
- **Nessun nucleo familiare.** L'ACS ragiona per famiglie e per case, non per
  individui; i dati sono individuali. Due pazienti alla stessa quota e a 3 m di
  distanza sono probabilmente la stessa porta, e noi li mostriamo come due righe.
- **Il 76% dei pazienti non ha nessuna condizione registrata.** Per tre quarti del
  carico l'unica leva che abbiamo è "da quanto non lo vedi".
- **Con lettura sempre dal server, la rete diventa il rischio numero uno del
  prodotto.** L'utente descritta in `ux-notes.md` ha rete incostante: ogni filtro
  che gira a vuoto è un motivo per tornare alla carta. Da misurare presto sul campo,
  non alla fine.
