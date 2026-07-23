// ============================================================================
// CONTRATTO — congelato. Lista, mappa e scheda programmano contro questo file.
// Ogni modifica è una rinegoziazione esplicita, non un commit di passaggio.
//
// Invarianti:
//  1. Nessun campo "giorni fa" attraversa la rete. Solo date 'YYYY-MM-DD'.
//     I giorni si derivano in lettura da OGGI (letto da app_config).
//  2. leggiMappa legge a blocchi: l'header Range di PostgREST è IGNORATO
//     sulle RPC, quindi la paginazione è per offset esplicito.
//  3. leggiContatori è UNA chiamata, mai una per chip.
// ============================================================================

export type FasciaEta = '0-6' | '6-18' | '19-45' | '45-65' | '66+';
export type Area = 'Rocinha' | 'Vidigal' | 'São Conrado';
export type Condizione = 'iperteso' | 'diabetico' | 'gravidanza';
export type BandaQuota = '0-50' | '50-100' | '100-150' | '150+';

export const FASCE_ETA: FasciaEta[] = ['0-6', '6-18', '19-45', '45-65', '66+'];
export const CONDIZIONI: Condizione[] = ['iperteso', 'diabetico', 'gravidanza'];
export const BANDE_QUOTA: BandaQuota[] = ['0-50', '50-100', '100-150', '150+'];

/** Riga della vista v_paziente: l'unica forma in cui un paziente esiste. */
export type Paziente = {
  paziente_id: string;
  nome: string;
  cognome: string;
  fascia_eta: FasciaEta;
  sesso: 'Femminile' | 'Maschile';
  vulnerabilita_sociale: boolean;
  iperteso: boolean;
  diabetico: boolean;
  gravidanza: boolean;
  latitudine: number;
  longitudine: number;
  quota_m: number;
  /** quota_m - quota della sede. Negativo = più in basso della sede. */
  dislivello_m: number;
  equipe_id: string;
  equipe_nome: string;
  area: Area;
  sede_latitudine: number;
  sede_longitudine: number;
  // --- stato: SEMPRE date, mai "giorni fa"
  ultima_visita: string | null;   // null = mai visitato
  n_visite: number;
  ultimo_ps: string | null;
  n_ps_totale: number;
  ps_scoperto_il: string | null;  // null = ricontattato, o mai al PS
};

/** Proiezione leggera per la mappa: sottoinsieme stretto di Paziente. */
export type PazienteMappa = Pick<
  Paziente,
  'paziente_id' | 'nome' | 'cognome' | 'latitudine' | 'longitudine'
  | 'quota_m' | 'ps_scoperto_il' | 'ultima_visita'
>;

export type Equipe = {
  equipe_id: string;
  equipe_nome: string;
  unita_nome: string;
  area: Area;
  sede_latitudine: number;
  sede_longitudine: number;
  sede_quota_m: number;
};

export type Professionista = {
  professionista_id: string;
  nome: string;
  cognome: string;
  equipe_id: string;
};

export type VoceTimeline = {
  data: string;
  tipo: 'visita-acs' | 'visita-specialistica-prenotata' | 'accesso-ps-o-ricovero';
};

export type SchedaPaziente = { paziente: Paziente; timeline: VoceTimeline[] };

// ---------------------------------------------------------------- filtri
/** Stato dei filtri: unica fonte di verità, vive nell'URL. */
export type Filtri = {
  equipe_id: string;
  cerca?: string;
  maiVisitato?: boolean;
  psNonRicontattato?: boolean;   // ps_scoperto_il >= OGGI - 90
  nonVistoDa90?: boolean;
  vulnerabile?: boolean;
  condizioni?: Condizione[];
  eta?: FasciaEta[];
  quota?: BandaQuota[];
};

/** Nomi dei parametri URL — CONGELATI: lista e mappa leggono lo stesso URL. */
export const PARAM = {
  equipe_id: 'e',
  cerca: 'q',
  maiVisitato: 'mv',
  psNonRicontattato: 'ps',
  nonVistoDa90: 'nv90',
  vulnerabile: 'vu',
  condizioni: 'c',
  eta: 'a',
  quota: 'z',
} as const;

/** Tutti i contatori in una risposta sola. */
export type Contatori = {
  totale: number;
  maiVisitato: number;
  psNonRicontattato: number;
  nonVistoDa90: number;
  vulnerabile: number;
  iperteso: number;
  diabetico: number;
  gravidanza: number;
  eta: Record<FasciaEta, number>;
  quota: Record<BandaQuota, number>;
};

export type Pagina<T> = { righe: T[]; fine: boolean };

export const PER_PAGINA = 50;

// ------------------------------------------------------- derivazioni da OGGI
// Le uniche funzioni autorizzate a trasformare una data in "giorni fa".

export function giorniDa(data: string | null, oggi: string): number | null {
  if (!data) return null;
  const ms = Date.parse(oggi + 'T00:00:00Z') - Date.parse(data + 'T00:00:00Z');
  return Math.round(ms / 86400000);
}

export function etichettaUltimaVisita(p: Paziente, oggi: string): string {
  const g = giorniDa(p.ultima_visita, oggi);
  if (g === null) return 'Mai visitato';
  if (g === 0) return 'Visitato oggi';
  if (g === 1) return 'Visitato ieri';
  if (g < 30) return `Visitato ${g} giorni fa`;
  const mesi = Math.floor(g / 30);
  return `Visitato ${mesi} ${mesi === 1 ? 'mese' : 'mesi'} fa`;
}

export function dataItaliana(data: string | null): string {
  if (!data) return '—';
  const [a, m, g] = data.split('-');
  return `${g}/${m}/${a}`;
}

export function etichettaDislivello(m: number): string {
  if (m === 0) return 'stessa quota della sede';
  return m > 0 ? `+${m} m dalla sede` : `${m} m dalla sede`;
}
