// Accesso ai dati — congelato insieme al contratto.
// Ogni schermata passa da qui. Nessun componente parla direttamente a Supabase.

import { createClient } from '@supabase/supabase-js';
import type {
  Contatori, Equipe, Filtri, Pagina, Paziente, PazienteMappa,
  Professionista, SchedaPaziente, VoceTimeline,
} from './contratto';
import { PER_PAGINA } from './contratto';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY,
);

/** I filtri, nella forma che si aspettano le RPC. */
function argomenti(f: Filtri) {
  return {
    p_equipe_id: f.equipe_id,
    p_cerca: f.cerca?.trim() || null,
    p_mai_visitato: !!f.maiVisitato,
    p_ps_non_ricontattato: !!f.psNonRicontattato,
    p_non_visto_da_90: !!f.nonVistoDa90,
    p_vulnerabile: !!f.vulnerabile,
    p_condizioni: f.condizioni?.length ? f.condizioni : null,
    p_eta: f.eta?.length ? f.eta : null,
    p_quota: f.quota?.length ? f.quota : null,
  };
}

function esplodi(errore: { message: string } | null, dove: string): void {
  if (errore) throw new Error(`${dove}: ${errore.message}`);
}

/** "Oggi" viene da app_config: unico punto, mai una data scritta nel codice. */
export async function leggiOggi(): Promise<string> {
  const { data, error } = await supabase
    .from('app_config').select('valore').eq('chiave', 'oggi').single();
  esplodi(error, 'leggiOggi');
  return data!.valore as string;
}

export async function leggiEquipe(): Promise<Equipe[]> {
  const { data, error } = await supabase
    .from('equipe').select('*').order('equipe_nome');
  esplodi(error, 'leggiEquipe');
  return data as Equipe[];
}

export async function leggiProfessionisti(): Promise<Professionista[]> {
  const { data, error } = await supabase
    .from('professionisti').select('*').order('nome');
  esplodi(error, 'leggiProfessionisti');
  return data as Professionista[];
}

/** Lista paginata, ordinata per dislivello con segno (prima chi sta più in basso). */
export async function leggiLista(f: Filtri, pagina: number): Promise<Pagina<Paziente>> {
  const { data, error } = await supabase.rpc('cerca_pazienti', {
    ...argomenti(f),
    p_offset: pagina * PER_PAGINA,
    p_limit: PER_PAGINA,
  });
  esplodi(error, 'leggiLista');
  const righe = (data ?? []) as Paziente[];
  return { righe, fine: righe.length < PER_PAGINA };
}

const BLOCCO = 1000;

/**
 * Insieme filtrato COMPLETO per la mappa.
 * PostgREST tronca a 1.000 righe e ignora l'header Range sulle RPC: senza
 * questo ciclo la mappa mostrerebbe 1.000 pazienti su 1.998, senza errore.
 */
export async function leggiMappa(f: Filtri): Promise<PazienteMappa[]> {
  const tutti: PazienteMappa[] = [];
  for (let offset = 0; ; offset += BLOCCO) {
    const { data, error } = await supabase.rpc('cerca_pazienti_mappa', {
      ...argomenti(f), p_offset: offset, p_limit: BLOCCO,
    });
    esplodi(error, 'leggiMappa');
    const blocco = (data ?? []) as PazienteMappa[];
    tutti.push(...blocco);
    if (blocco.length < BLOCCO) return tutti;
  }
}

/** Tutti i contatori dei chip in una chiamata sola. */
export async function leggiContatori(f: Filtri): Promise<Contatori> {
  const { data, error } = await supabase.rpc('conteggi_filtri', argomenti(f));
  esplodi(error, 'leggiContatori');
  return data as Contatori;
}

export async function leggiScheda(paziente_id: string): Promise<SchedaPaziente> {
  const [p, t] = await Promise.all([
    supabase.from('v_paziente').select('*').eq('paziente_id', paziente_id).single(),
    supabase.rpc('timeline_paziente', { p_paziente_id: paziente_id }),
  ]);
  esplodi(p.error, 'leggiScheda/paziente');
  esplodi(t.error, 'leggiScheda/timeline');
  return {
    paziente: p.data as Paziente,
    timeline: (t.data ?? []) as VoceTimeline[],
  };
}
