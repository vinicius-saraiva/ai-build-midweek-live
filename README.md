# ⚙️ Visitare — repo di lavoro (AI Build Midweek)

Questo è il **repo di lavoro** della sessione *AI Build Midweek* di Product Heroes:
tutto ciò che abbiamo costruito in diretta per portare **Visitare** — l'app che dà a un
Agente Comunitario di Salute (ACS) la lista e la mappa dei suoi pazienti — dall'idea a
un'app online, in ~60 minuti.

Non è solo il codice: è **il percorso completo**, artefatto per artefatto, così com'è
uscito dalla sessione.

| | Link |
|:--|:-----|
| 📄 **La sfida + il dataset** | [`visitare-case-it`](https://github.com/vinicius-saraiva/visitare-case-it) |
| 🚀 **L'app funzionante, online** | [visitare-rio.vercel.app](https://visitare-rio.vercel.app/) |
| 📝 **I prompt che ho usato** | [`prompts.md`](prompts.md) |

---

## 🧭 Il metodo — RePPIT

Ogni fase ha lasciato un **artefatto scritto** che la fase successiva si rilegge come
contesto. È così che un progetto non si sfilaccia: il contesto non si urla nel prompt,
si deposita nei file.

| | Fase | Domanda | Artefatto |
|:--|:-----|:--------|:----------|
| **Re** | Research | Cosa abbiamo davvero tra le mani? | [`research.md`](research.md) · [`mappa-3d.html`](mappa-3d.html) |
| **P** | Propose | Cosa costruiamo, tra le opzioni? | [`proposal.md`](proposal.md) · [`stack-proposal.md`](stack-proposal.md) |
| **P** | Plan | In che ordine, cosa si parallelizza? | [`plan.md`](plan.md) |
| **I** | Implement | Costruiamolo | [`visitare-app/`](visitare-app/) · [`supabase/`](supabase/) |
| **T** | Test | Funziona davvero, o solo in teoria? | prova a 390 px + deploy su Vercel |

> RePPIT è un metodo ideato da [Mihail Eric](https://themodernsoftware.dev/); il mio
> approfondimento è su [vinicius.pm/reppit](https://vinicius.pm/reppit).

---

## 🗂️ Cosa c'è nel repo

```
.
├── CLAUDE.md              # Le "regole della casa": mobile-first, 44px, verifica nel browser
├── ux-notes.md           # Riferimenti UX portati come PM: chi è l'utente, schemi, anti-pattern
│
├── research.md           # Re · analisi del dataset: volumi, rischi, lacune, trappole
├── proposal.md           # P  · proposta di prodotto per l'MVP
├── stack-proposal.md     # P  · proposta tecnica (front-end, mappa, back-end, hosting)
├── plan.md               # P  · piano di implementazione, con "contratto" e Definition of Done
├── prompts.md            # I miei prompt originali, per fase RePPIT
│
├── mappa-3d.html         # Tutti i pazienti su un rilievo 3D, colorati per quota (pagina autonoma)
├── brand-system-proposal/# Identità visiva: logo, pin, favicon, lockup
│
├── supabase/migrations/  # Schema, trigger di stato, funzione oggi() — il back-end
├── sql/                  # Query di verifica
│
└── visitare-app/         # L'app (l'artefatto della fase Implement)
```

---

## 💻 L'app — `visitare-app/`

Front-end **Vite + React + TypeScript**, stile con **Tailwind**, installabile come
**PWA**. Mappa con **MapLibre GL** (nessuna API key). Legge **solo da Supabase**
(`@supabase/supabase-js`): niente dati finti, nessun percorso di riserva.

Punti chiave del codice:

- `src/dati/contratto.ts` — il **contratto**: il tipo TypeScript della vista di lettura.
  È lui che ha sbloccato il lavoro in parallelo tra chi ha fatto la lista e chi la mappa.
- `src/schermate/` — le tre schermate: `Lista`, `Mappa`, `Scheda` paziente.
- `src/stato/filtriUrl.ts` — lo stato dei filtri vive nell'**URL**, così sopravvive al
  passaggio lista ⇄ mappa ed è condivisibile con un link.
- `src/componenti/` — barra filtri, foglio dal basso, selettore ACS con ricerca,
  nastro di schede sulla mappa, timeline della scheda paziente.

### Girarla in locale

L'app ha bisogno di un progetto Supabase con lo schema applicato (le migrazioni in
[`supabase/migrations/`](supabase/migrations/)). Poi:

```bash
cd visitare-app
npm install

# crea visitare-app/.env.local con le tue chiavi:
#   VITE_SUPABASE_URL=https://<il-tuo-progetto>.supabase.co
#   VITE_SUPABASE_KEY=<chiave-pubblicabile-sb_publishable_…>

npm run dev
```

> ⚠️ Le chiavi del progetto usato in diretta **non** sono in questo repo (sono in un
> `.env.local` ignorato da git). Servono le tue.

---

## 🗄️ Il back-end — `supabase/`

Le migrazioni raccontano le due decisioni interessanti del back-end:

- **Stato precalcolato con trigger** invece che con una vista materializzata: i filtri
  "è passato dal pronto soccorso e nessuno l'ha più richiamato" sono un join su 260k
  righe, troppo caro a ogni tocco. Con i trigger lo stato si mantiene fresco a ogni
  scrittura — e il back-end è già pronto per il giorno in cui l'app scriverà davvero.
- **`oggi()` come manopola**: i dati finiscono a fine 2025, quindi "oggi" è una riga di
  configurazione (default `2026-01-02`), non una costante nel codice. Il giorno in cui i
  dati diventano veri, si svuota il flag — non si tocca il codice.

---

## 🙌 Crediti

Adattamento italiano della sfida del
[Claude Impact Lab Rio 2026](https://github.com/prefeitura-rio/claude-impact-lab-saude)
(Anthropic · Prefeitura do Rio de Janeiro). Progetto vincitore dell'edizione originale:
[Visitare](https://github.com/Visitare/visitare) — team ACS Digital.

*Visitare · AI Build Midweek · Product Heroes · 22 luglio 2026*
