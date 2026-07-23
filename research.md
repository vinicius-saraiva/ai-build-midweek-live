# Visitare — ricerca sul dataset

Fonte: `visitare-case-it/assets/parquet/` (5 tabelle). Analisi con uv + pandas,
nessuna dipendenza installata nel progetto. **"Oggi" = 2 gennaio 2026.**

---

## 1. Cosa possiamo mostrare all'ACS

### Su di sé
L'ACS ha un'identità completa nei dati e un perimetro netto.

- Nome, cognome, équipe di appartenenza, UBS di partenza (con coordinate).
- **Il suo carico: ~999 pazienti.** Ogni équipe ha esattamente 2 ACS e ~1.999 pazienti.
- Il suo anno: 883–3.221 visite (mediana 1.514), su 93–259 giorni lavorati.
- **Quanti dei suoi pazienti ha effettivamente toccato**: fra 342 e 776 su ~999.
  È il numero più onesto che possiamo dargli.
- I suoi percorsi storici: mediana 24 m fra una casa e l'altra, ~434 m di cammino
  planare al giorno, **+31 m di salita totale** a giornata.

### Sulla sua équipe
- Territorio contiguo e proprio: **0 visite fuori dall'équipe**, su 159.599.
  Ogni paziente visitato ha sempre e solo **un** ACS. Nessuna ambiguità di titolarità.
- Confronto con il collega: sono due, stesso territorio, carichi confrontabili.
- La sede UBS (9 in tutto) è il punto di partenza reale di ogni giornata.

### Sui suoi pazienti
Per ogni paziente abbiamo, senza calcoli fragili:
nome, fascia d'età, sesso, razza/colore, vulnerabilità sociale, iperteso, diabetico,
gravidanza, casa (lat/lon), **quota in metri**, ultima visita, numero di visite,
ultimo accesso al PS, ultima visita specialistica prenotata.

Da cui si deriva in lettura, mai da salvare:
giorni dall'ultima visita · dislivello dalla posizione corrente · PS recente senza
visita successiva · appuntamento specialistico da comunicare.

---

## 2. I numeri chiave

**Volumi**

| | |
|---|---|
| Pazienti | 97.938 |
| ACS | 98 · Équipe 49 (2 ACS ciascuna) · UBS 9 |
| Visite ACS | 159.599 su 261 giorni feriali (2/1/2025 → 1/1/2026) |
| Eventi clinici | 100.503 → 71.668 specialistiche · 28.835 PS/ricoveri |
| Aree | Rocinha 63.959 · Vidigal 19.991 · São Conrado 13.988 |

**Distribuzioni**

- Età: 19-45 → 34.505 (35%) · 45-65 → 26.092 (27%) · **66+ → 24.858 (25%)** ·
  6-18 → 9.737 · 0-6 → 2.746.
- Sesso: F 55.283 (56%) / M 42.655.
- **Quota: mediana 64 m, massimo 285 m.** Ma per area cambia tutto:
  Vidigal mediana **101 m**, Rocinha 62 m, São Conrado **23 m**.
  Il Vidigal è il territorio caro; São Conrado è pianeggiante.
- Distanza dalla sede UBS: mediana 259 m, massimo 1.190 m. **È tutto vicino.
  Il costo non è la distanza, è la salita.**

**Tassi di rischio**

| | pazienti | % |
|---|---|---|
| Iperteso | 21.017 | 21,5% |
| Diabetico | 8.172 | 8,3% |
| Iperteso **e** diabetico | 6.385 | 6,5% |
| Vulnerabilità sociale | 9.191 | 9,4% |
| Gravidanza | 661 | 0,7% |
| Con ≥1 accesso PS/ricovero (2025) | 14.437 | 14,7% |
| **Nessuna condizione registrata** | 74.520 | 76% |

Croniche concentrate sugli anziani: fra i 66+, **44% iperteso** e 18,5% diabetico;
fra i 45-65, 31% e 12%. Sotto i 18 anni: praticamente zero.

---

## 3. Le lacune di cura che l'app può chiudere

### Lacuna 1 — metà dei pazienti non è mai stata visitata
**48.838 pazienti (49,9%) non compaiono in nessuna visita.** Fra loro:
- **12.636 hanno 66+ anni**
- 6.198 sono cronici o in gravidanza
- 2.838 sono in vulnerabilità sociale

E non è che i non visitati stiano meglio: sono semplicemente *meno noti*.
Fra i visitati il 31% è iperteso, fra i mai visitati l'11,6% — differenza che dice
più sulla registrazione che sulla salute.

### Lacuna 2 — la frequenza non regge nemmeno per chi è noto
Chi è stato visitato ha mediana **2 visite in un anno**, ultima **93 giorni fa**.

| Senza visita da… | pazienti | % del totale |
|---|---|---|
| > 30 giorni (o mai) | 87.806 | 89,7% |
| > 90 giorni (o mai) | 73.979 | **75,5%** |
| > 180 giorni (o mai) | 61.651 | 62,9% |

### Lacuna 3 — il PS non richiama nessuno
**5.466 pazienti sono stati al PS o ricoverati negli ultimi 90 giorni.
4.074 di loro (75%) non hanno ricevuto nessuna visita ACS dopo.**
Negli ultimi 30 giorni: 1.781 casi scoperti. Questa è la lista che l'app deve
mettere in cima domani mattina — sono ~18 pazienti per ACS, non un oceano.

### Lacuna 4 — gli appuntamenti specialistici non vengono comunicati
71.668 visite specialistiche prenotate su 24.958 pazienti distinti. È esattamente
il compito che il README assegna all'ACS ("da comunicare al paziente") e nel
dataset **non esiste traccia di comunicazione avvenuta**. ~2.236 appuntamenti
cadono nei 14 giorni intorno a oggi.

### La capacità c'è — è la distribuzione che manca
159.599 visite / 97.938 pazienti = **1,63 visite per paziente all'anno**.
Con 98 ACS e 261 giorni, per vedere ogni paziente una volta l'anno basterebbero
**4 visite al giorno per ACS**. Ne fanno 10,5. Il problema non è il volume:
è che le visite si concentrano su chi è già noto (un paziente ne ha ricevute 118).

**Dimensionamento di una lista prioritaria plausibile per oggi:**

| Criterio | pazienti |
|---|---|
| A. PS negli ultimi 30 gg, nessuna visita dopo | 1.781 |
| B. Gravide senza visita da 60 gg | 270 |
| C. Cronici senza visita da 180 gg | 9.444 |
| D. 66+ vulnerabili senza visita da 90 gg | 360 |
| **Unione** | **11.549 → ~118 per ACS** |

118 per ACS su 10 slot al giorno: la lista è ~12 giorni di lavoro. **Un ordinamento
serve davvero**, e A+B+D (≈2.400, ~25 per ACS) è la parte che va chiusa in giorni.

---

## 4. Le trappole nei dati

### 4.1 `unita_id` in `pazienti` NON è `unita_id` in `equipe`
Entrambe hanno 9 valori distinti, **intersezione zero**: sono due schemi di hash
diversi. Un join su `unita_id` restituisce 0 righe (o, peggio, sembra funzionare
e non lo fa). **Unico join valido: `equipe_id`.** Da lì si arriva a `unita_nome`,
`area` e alle coordinate della sede.

### 4.2 Nessun evento clinico è nel futuro
Gli eventi si fermano al **31/12/2025**, "oggi" è il 2/1/2026. Non esiste nessun
appuntamento futuro. Una scheda "prossimo appuntamento" sarebbe sempre vuota.
Va riformulata in **"ultimo appuntamento / ultimo accesso PS"**, oppure si sposta
"oggi" indietro nel 2025 — è configurabile da `app_config`, ma va deciso ora
perché cambia l'interfaccia.

### 4.3 Le visite sono duplicate, e in modo subdolo
Il percorso quotidiano dovrebbe essere 8-12 visite: lo è in 15.074 giornate su 15.240.
Ma **78 coppie ACS-giorno hanno 16-29 visite**, con `ordine_visita_giorno`
duplicato (734 casi): due itinerari sovrapposti nello stesso giorno.
In totale **2.726 coppie paziente-giorno duplicate** e 4 righe interamente doppie.
`COUNT(*)` sulle visite sovrastima. Deduplicare su
`(professionista_id, registrata_il, paziente_id)`; non fidarsi mai di
`ordine_visita_giorno` come chiave.

### 4.4 Il rischio si inverte se non stratifichi per età (Simpson)
In aggregato il tasso di PS è **più basso** fra gli ipertesi (13,6%) che fra i non
ipertesi (19,1%). Sembra che l'ipertensione protegga. Non è così: il PS è
trainato dai bambini 0-6 (20,4%) e dai giovani adulti, che non sono ipertesi.
**Stratificando, si inverte**: fra i 66+, ipertesi 16,9% vs non ipertesi 6,6%.
Stesso schema per il diabete. Un punteggio di rischio costruito sulle correlazioni
grezze prioritizzerà i sani.

### 4.5 La vulnerabilità sociale non è dove ce l'aspettiamo
0-6 → 22,5% · 6-18 → 23,5% · 19-45 → 11,6% · 45-65 → 6,5% · **66+ → 2,4%.**
È un marcatore di *famiglia con bambini*, non di anziano solo. Un filtro
"anziani vulnerabili" pesca 586 persone in tutto il territorio.

### 4.6 Omonimi ovunque
Solo **67 nomi propri e 900 cognomi** per 97.938 pazienti: 47.327 nomi completi
distinti, **l'81% dei pazienti condivide nome e cognome con qualcun altro**
(fino a 13 persone identiche). In lista e nella ricerca il nome da solo non
identifica nessuno: serve sempre un secondo elemento (età + via/quota).

### 4.7 PostgREST tronca a 1.000 righe
Già noto (`CLAUDE.md`) e qui è letale: ogni équipe ha ~1.999 pazienti,
ogni ACS ~999. **Il carico di una singola équipe supera il limite di 1 riga per
lato.** Senza lettura a blocchi si vedono 1.000 pazienti su 1.999 e sembra normale.
Testare sempre su un'équipe intera, mai su un ACS.

### 4.8 I territori delle équipe non sono ugualmente compatti
Raggio p90 mediano 107 m, ma **Estrada da Gávea 1.576 m e Rua Um 1.460 m**.
Una mappa che inquadra automaticamente sul territorio dell'équipe darà zoom
utilissimi in Rocinha e inutilizzabili in São Conrado. Inquadratura sui punti
reali, non su un raggio fisso.

### 4.9 Le code temporali sono irregolari
31/12/2025 → 120 visite, 1/1/2026 → 7 (festivo, ma non zero). Un grafico
"visite negli ultimi 30 giorni" mostrerà un crollo che è di calendario, non di
performance. E le visite ci sono **solo nei giorni feriali**: nessuna nel weekend.

### 4.10 Valori estremi da non mostrare crudi
Un paziente ha **118 visite** in un anno, 19 pazienti ne hanno più di 50;
un paziente ha **53 accessi al PS**. Medie e "top pazienti" vanno mediati o
tagliati, altrimenti la scheda ACS racconta un caso limite invece del suo lavoro.

### 4.11 Quanto è pulito, per il resto
Zero valori nulli in tutte e 5 le tabelle. Zero orfani su tutte le chiavi esterne.
Zero `paziente_id` duplicati. Ogni équipe ha ACS e pazienti. **Il problema di
questo dataset non è la sporcizia: è l'interpretazione.**

---

## 5. Cosa ne segue per l'app

1. **La lista di default non è "tutti i miei pazienti"** (999, illeggibili in piedi):
   è "chi ha bisogno oggi" — PS scoperto, gravide, cronici scaduti. ~25 nomi.
2. **Ordinare per dislivello, non per distanza.** Tutto sta entro 400 m dalla sede;
   quello che cambia la giornata è che il Vidigal sta 100 m più in alto.
3. **"Mai visitato" è uno stato di prima classe**, non un `null` da nascondere:
   riguarda metà del territorio.
4. **Ogni riga della lista deve disambiguare l'omonimo** — nome + età + quota.
5. Il punteggio di rischio, se ci sarà, va costruito **dentro le fasce d'età**,
   mai sulle correlazioni grezze.
