# Visitare — app per gli Agenti Comunitari di Salute (ACS)

## Contesto d'uso

App per l'ACS che ogni mattina deve sapere chi visitare.
Si usa **in piedi, per strada, con una mano sola**, su telefoni Android di fascia
bassa e con rete lenta. Non è una dashboard da scrivania.

## Regole di interfaccia — non negoziabili

- **Mobile-first**: progetta a 390 px, poi adatta. Verifica sempre a 390 px.
- **Area di tocco minima 44 px.**
- **Filtri**: una sola riga a scorrimento orizzontale. Interruttori per i sì/no,
  bottom sheet con "Applica" per le scelte multiple. Contatore su ogni filtro.
- **Azione principale**: pulsante flottante in basso a destra. Mai una riga che
  ruba spazio verticale alla lista.
- **Intestazione**: massimo 2 righe. Mai ripetere numeri già visibili altrove.
- **Liste di scelte con più di 20 voci**: bottom sheet con ricerca, mai `<select>`.
- **Ogni attesa oltre 200 ms** ha un feedback esplicito (skeleton, spinner, testo
  con `aria-live`). L'utente non deve mai chiedersi se ha funzionato.
- Niente `backdrop-blur` né animazioni costose: i telefoni sono lenti.
- Mai il colore da solo per distinguere uno stato.

## Regole tecniche

- Non verificare tutto sul browser usando Claude Chrome Extension. Chiedi prima a me e poi se c'è bisogno ti chiedo di riverificare con Claude Chrome Extension.
- Non salvare mai valori che dipendono da "oggi": salva le **date**, deriva in lettura.
- I dati storici sono immutabili: **cache in memoria**, non rileggerli a ogni filtro.
- "Oggi" è il **2 gennaio 2026**, configurabile da un solo punto (tabella `app_config`).

## Back-end (Supabase) — trappole già incontrate, non ripeterle

- **PostgREST tronca le risposte a 1.000 righe.** Un `.range()` singolo non basta:
  il limite è imposto dal server. Leggi **a blocchi di 1.000** finché la pagina non
  è più piena, altrimenti l'app mostra 1.000 pazienti invece di 1.998.
- Le colonne di stato (`ultima_visita`, `n_visite`, `ultimo_ps`) si mantengono con
  **trigger**, non con viste materializzate: una vista materializzata non si aggiorna
  da sola.
- Il progetto Supabase esiste già ed è collegato: **non crearne uno nuovo**, non
  lanciare `supabase login` (non è un terminale interattivo).
- **Unica sorgente dati: Supabase.** Niente JSON locali, niente dati finti, nessun
  percorso di riserva: l'app legge dal database e basta.

## Lingua

Interfaccia, nomi di file, variabili e commenti in **italiano**.
