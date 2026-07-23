# Riferimenti UX — Visitare

> Quello che un product manager porta al tavolo prima di far scrivere una riga di
> codice: chi è l'utente, in che condizioni lavora, e quali schemi di interazione
> abbiamo già visto funzionare altrove.

## Chi userà l'app

Una donna sui 40, assunta nel quartiere in cui vive. Cammina in salita per cinque ore
al giorno con una borsa a tracolla. Consulta il telefono **in piedi, con una mano**,
spesso al sole. Telefono Android di fascia bassa, rete mobile incostante.

Non è una dashboard da scrivania. Ogni decisione di interfaccia scende da qui.

## Riferimenti da cui copiare

**Wellhub (ex Gympass)** — è il modello per due schermate:

- **Barra dei filtri**: una sola riga a scorrimento orizzontale sopra i risultati.
  I filtri semplici sono interruttori a un tocco; quelli con più scelte aprono un
  foglio dal basso con selezione multipla e un pulsante *Applica*.
- **Mappa con nastro di schede**: toccando un punto compare una scheda in basso,
  staccata dal bordo. Le schede scorrono in orizzontale e la mappa segue la selezione;
  toccando la scheda si apre il dettaglio completo.

**Google Maps** — il raggruppamento dei punti in cerchi numerati quando si è troppo
lontani, invece di mille pin sovrapposti.

## Schemi di interazione decisi

| Elemento | Scelta | Perché |
|:---------|:-------|:-------|
| Filtri | Riga orizzontale scorrevole + foglio dal basso | Tre righe di chip mangiano mezzo schermo |
| Filtri a scelta multipla | Bozza + pulsante *Applica* | Su rete lenta, evita una richiesta a ogni tocco |
| Azione "vedi sulla mappa" | Pulsante flottante in basso a destra | Non ruba una riga di lista |
| Selettore ACS (98 nomi) | Foglio dal basso **con ricerca** | Il menu nativo di Android con 98 voci è inservibile |
| Intestazione | Massimo 2 righe | Deve restare spazio ai pazienti |
| Stato dei filtri | Nell'URL | Sopravvive al passaggio lista ⇄ mappa e si può mandare a un collega |
| Ricerca per nome | Attesa di 350 ms dopo l'ultima lettera | Evita una richiesta per carattere |

## Installabile sul telefono (PWA)

L'ACS non apre un browser e digita un indirizzo ogni mattina: deve avere **l'icona
sulla schermata Home**, come qualsiasi altra app che usa.

Quindi l'app nasce **installabile**: manifest, icone, avvio a schermo intero senza
barra del browser, e una cache che le permetta di aprirsi anche con la rete che va e
viene. Non è un extra da aggiungere alla fine: è come si presenta al suo utente.

## Le tre schermate

**Lista** — filtri combinabili con contatore, ricerca per nome, pulsante flottante
verso la mappa.

**Mappa** — stessi filtri della lista, pin colorati per quota, raggruppamento a zoom
largo, nastro di schede in basso.

**Scheda paziente** — condizioni, giorni dall'ultima visita, accessi al pronto
soccorso, e una timeline unica che unisce visite ed eventi clinici.

## Cosa non voglio vedere

- Tre righe di chip di filtro impilate
- Un `<select>` nativo con 98 nomi dentro
- Numeri nell'intestazione che sono già nei contatori dei filtri
- Uno stato di caricamento senza spiegazione: se aspetta, deve dire perché
- Effetti costosi (`backdrop-blur`, animazioni elaborate): il telefono è lento
