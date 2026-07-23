// Serializzazione dei filtri nell'URL — consegnato per primo: lista e mappa
// ci si appoggiano entrambe. I nomi dei parametri vengono da PARAM (congelati).
// Lo stato nell'URL sopravvive al passaggio lista ⇄ mappa e si manda a un collega.

import { PARAM } from '../dati/contratto';
import type { BandaQuota, Condizione, FasciaEta, Filtri } from '../dati/contratto';

const CHIAVE_MEMORIA = 'visitare:ultimi-filtri';
const CHIAVE_ACS = 'visitare:ultimo-acs';

export function filtriDaUrl(ricerca: string): Filtri | null {
  const p = new URLSearchParams(ricerca);
  const equipe_id = p.get(PARAM.equipe_id);
  if (!equipe_id) return null;

  const lista = <T extends string>(chiave: string): T[] | undefined => {
    const v = p.get(chiave);
    return v ? (v.split(',').filter(Boolean) as T[]) : undefined;
  };
  const flag = (chiave: string) => (p.get(chiave) === '1' ? true : undefined);

  return {
    equipe_id,
    cerca: p.get(PARAM.cerca) || undefined,
    maiVisitato: flag(PARAM.maiVisitato),
    psNonRicontattato: flag(PARAM.psNonRicontattato),
    nonVistoDa90: flag(PARAM.nonVistoDa90),
    vulnerabile: flag(PARAM.vulnerabile),
    condizioni: lista<Condizione>(PARAM.condizioni),
    eta: lista<FasciaEta>(PARAM.eta),
    quota: lista<BandaQuota>(PARAM.quota),
  };
}

export function urlDaFiltri(f: Filtri): string {
  const p = new URLSearchParams();
  p.set(PARAM.equipe_id, f.equipe_id);
  if (f.cerca?.trim()) p.set(PARAM.cerca, f.cerca.trim());
  if (f.maiVisitato) p.set(PARAM.maiVisitato, '1');
  if (f.psNonRicontattato) p.set(PARAM.psNonRicontattato, '1');
  if (f.nonVistoDa90) p.set(PARAM.nonVistoDa90, '1');
  if (f.vulnerabile) p.set(PARAM.vulnerabile, '1');
  if (f.condizioni?.length) p.set(PARAM.condizioni, f.condizioni.join(','));
  if (f.eta?.length) p.set(PARAM.eta, f.eta.join(','));
  if (f.quota?.length) p.set(PARAM.quota, f.quota.join(','));
  return p.toString();
}

/** Quanti filtri sono attivi — per l'etichetta "Azzera (3)". */
export function quantiAttivi(f: Filtri): number {
  return [
    f.maiVisitato, f.psNonRicontattato, f.nonVistoDa90, f.vulnerabile,
    f.condizioni?.length, f.eta?.length, f.quota?.length,
  ].filter(Boolean).length;
}

export function azzera(f: Filtri): Filtri {
  return { equipe_id: f.equipe_id, cerca: f.cerca };
}

// L'app si riapre sul modo di lavorare dell'ultima sessione.
export function ricordaFiltri(f: Filtri): void {
  try { localStorage.setItem(CHIAVE_MEMORIA, urlDaFiltri(f)); } catch { /* ignora */ }
}

export function filtriRicordati(): Filtri | null {
  try {
    const v = localStorage.getItem(CHIAVE_MEMORIA);
    return v ? filtriDaUrl(v) : null;
  } catch { return null; }
}

// ============================================================================
// Guscio — aggiunta del blocco 5. Nient'altro qui sopra è cambiato: le firme
// esistenti sono usate da lista e mappa e restano com'erano.
//
// Nell'URL vivono tre cose oltre ai filtri: quale schermata è aperta, quale
// paziente è aperto, e quale ACS è al lavoro. Così l'URL incollato a un collega
// riapre esattamente la stessa cosa, e il tasto Indietro di Android funziona.
// ============================================================================

export type Schermata = 'lista' | 'mappa' | 'scheda';

/** Parametri del guscio — separati da PARAM, che è congelato. */
export const PARAM_GUSCIO = {
  schermata: 'v',
  paziente: 'p',
  acs: 'acs',
} as const;

export type StatoUrl = {
  filtri: Filtri | null;
  schermata: Schermata;
  pazienteId: string | null;
  acsId: string | null;
};

function schermataValida(v: string | null): Schermata {
  return v === 'mappa' || v === 'scheda' ? v : 'lista';
}

export function statoDaUrl(ricerca: string): StatoUrl {
  const p = new URLSearchParams(ricerca);
  const pazienteId = p.get(PARAM_GUSCIO.paziente) || null;
  let schermata = schermataValida(p.get(PARAM_GUSCIO.schermata));
  // Una scheda senza paziente non esiste: si ricade sulla lista.
  if (schermata === 'scheda' && !pazienteId) schermata = 'lista';
  return {
    filtri: filtriDaUrl(ricerca),
    schermata,
    pazienteId,
    acsId: p.get(PARAM_GUSCIO.acs) || null,
  };
}

export function urlDaStato(s: {
  filtri: Filtri;
  schermata: Schermata;
  pazienteId?: string | null;
  acsId?: string | null;
}): string {
  const p = new URLSearchParams(urlDaFiltri(s.filtri));
  if (s.schermata !== 'lista') p.set(PARAM_GUSCIO.schermata, s.schermata);
  if (s.pazienteId) p.set(PARAM_GUSCIO.paziente, s.pazienteId);
  if (s.acsId) p.set(PARAM_GUSCIO.acs, s.acsId);
  return p.toString();
}

/** L'ACS scelto si ricorda insieme ai filtri: domani mattina è già lei. */
export function ricordaAcs(professionista_id: string): void {
  try { localStorage.setItem(CHIAVE_ACS, professionista_id); } catch { /* ignora */ }
}

export function acsRicordato(): string | null {
  try { return localStorage.getItem(CHIAVE_ACS); } catch { return null; }
}
