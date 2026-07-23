// Pin della mappa: colore per quota, forma per stato.
//
// Regola non negoziabile: lo stato non è MAI solo colore.
//  - il colore dice la QUOTA (rampa continua verde → terracotta);
//  - la FORMA dice lo stato: cerchio = paziente normale,
//    rombo con contorno scuro = PS non ricontattato (`ps_scoperto_il` non nullo).
//
// I colori non sono scritti qui: si leggono dai token in `index.css`, così la
// mappa segue anche il tema scuro senza una seconda tavolozza.

import type { Map as MappaGL } from 'maplibre-gl';
import type { PazienteMappa } from '../dati/contratto';
import { giorniDa } from '../dati/contratto';

/** Legge un token colore da `index.css`. Il ripiego serve solo se il CSS non è ancora applicato. */
export function leggiToken(nome: string, ripiego: string): string {
  if (typeof document === 'undefined') return ripiego;
  const v = getComputedStyle(document.documentElement).getPropertyValue(`--color-${nome}`).trim();
  return v || ripiego;
}

/** Estremi della rampa di quota. Il territorio sta entro ~200 m sul versante. */
export const QUOTA_MIN = 0;
export const QUOTA_MAX = 175;

/** Le quattro bande di quota del contratto, con il valore centrale usato per l'icona. */
export const CENTRI_BANDA = [25, 75, 125, 175];

export type TavolozzaMappa = {
  bassa: string;      // verde   — quota bassa
  alta: string;       // terracotta — quota alta
  urgenza: string;    // contorno del rombo PS
  scheda: string;     // contorno chiaro dei pin
  blu: string;        // raggruppamenti e selezione
  inchiostro: string;
};

export function tavolozza(): TavolozzaMappa {
  return {
    bassa: leggiToken('verde', '#2F7A5B'),
    alta: leggiToken('terracotta', '#C75B39'),
    urgenza: leggiToken('urgenza', '#B3261E'),
    scheda: leggiToken('scheda', '#FFFFFF'),
    blu: leggiToken('blu', '#14507A'),
    inchiostro: leggiToken('inchiostro', '#141A1E'),
  };
}

// ------------------------------------------------------------------ colori

function daHex(c: string): [number, number, number] {
  let h = c.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function aHex(r: number, g: number, b: number): string {
  const p = (x: number) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0');
  return `#${p(r)}${p(g)}${p(b)}`;
}

/** Colore del pin per una quota in metri: rampa continua verde → terracotta. */
export function coloreQuota(quota_m: number, tav = tavolozza()): string {
  const t = Math.max(0, Math.min(1, (quota_m - QUOTA_MIN) / (QUOTA_MAX - QUOTA_MIN)));
  const [r1, g1, b1] = daHex(tav.bassa);
  const [r2, g2, b2] = daHex(tav.alta);
  return aHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

/** La stessa rampa, come espressione MapLibre sul campo `quota` della feature. */
export function espressioneColoreQuota(tav = tavolozza()): unknown[] {
  return [
    'interpolate', ['linear'], ['get', 'quota'],
    QUOTA_MIN, tav.bassa,
    QUOTA_MAX, tav.alta,
  ];
}

// ------------------------------------------------------------------- icone
// Un rombo per banda di quota, disegnato su canvas: nessun file esterno,
// nessun font, nessuna richiesta di rete in più.

const LATO = 30; // px logici del riquadro dell'icona

export function nomeIconaRombo(indiceBanda: number): string {
  return `rombo-ps-${indiceBanda}`;
}

/** Registra i rombi "PS non ricontattato" nello stile. Da chiamare a stile caricato. */
export function registraIconeRombo(mappa: MappaGL, tav = tavolozza()): void {
  const dpr = 2;
  CENTRI_BANDA.forEach((centro, i) => {
    const nome = nomeIconaRombo(i);
    if (mappa.hasImage(nome)) return;
    const tela = document.createElement('canvas');
    tela.width = LATO * dpr;
    tela.height = LATO * dpr;
    const c = tela.getContext('2d');
    if (!c) return;
    c.scale(dpr, dpr);
    const m = LATO / 2;
    const raggio = m - 4;
    c.beginPath();
    c.moveTo(m, m - raggio);
    c.lineTo(m + raggio, m);
    c.lineTo(m, m + raggio);
    c.lineTo(m - raggio, m);
    c.closePath();
    c.fillStyle = coloreQuota(centro, tav);
    c.fill();
    c.lineWidth = 3;
    c.strokeStyle = tav.urgenza;
    c.stroke();
    const dati = c.getImageData(0, 0, tela.width, tela.height);
    mappa.addImage(nome, dati, { pixelRatio: dpr });
  });
}

/** Sceglie il rombo giusto in base alla quota, come espressione MapLibre. */
export function espressioneIconaRombo(): unknown[] {
  return [
    'step', ['get', 'quota'],
    nomeIconaRombo(0),
    50, nomeIconaRombo(1),
    100, nomeIconaRombo(2),
    150, nomeIconaRombo(3),
  ];
}

// ----------------------------------------------------------------- geojson

export type CollezionePunti = {
  type: 'FeatureCollection';
  features: {
    type: 'Feature';
    id: number;
    geometry: { type: 'Point'; coordinates: [number, number] };
    properties: { id: string; quota: number; ps: boolean };
  }[];
};

/** Proiezione dei pazienti in GeoJSON: solo ciò che serve a disegnare. */
/**
 * `oggi` serve per la stessa definizione di urgenza del chip "PS non
 * ricontattato": ps_scoperto_il negli ultimi 90 giorni. Senza, la mappa
 * segnava come urgente qualsiasi PS mai ricontattato, di qualunque epoca —
 * il doppio dei pazienti che il filtro conta, con la stessa etichetta.
 * La soglia si deriva in lettura: nel database resta solo la data.
 */
export function collezionePunti(pazienti: PazienteMappa[], oggi: string): CollezionePunti {
  return {
    type: 'FeatureCollection',
    features: pazienti.map((p, i) => ({
      type: 'Feature' as const,
      id: i,
      geometry: { type: 'Point' as const, coordinates: [p.longitudine, p.latitudine] as [number, number] },
      properties: {
        id: p.paziente_id,
        quota: p.quota_m,
        ps: (giorniDa(p.ps_scoperto_il, oggi) ?? Infinity) <= 90,
      },
    })),
  };
}

/** Riquadro che contiene tutti i punti. Mai un raggio fisso: i territori vanno da 35 m a 1.576 m. */
export function riquadro(
  pazienti: PazienteMappa[],
  extra: { latitudine: number; longitudine: number } | null,
): [[number, number], [number, number]] | null {
  const punti: [number, number][] = pazienti.map((p) => [p.longitudine, p.latitudine]);
  if (extra) punti.push([extra.longitudine, extra.latitudine]);
  if (punti.length === 0) return null;
  let oOvest = punti[0][0], oEst = punti[0][0], oSud = punti[0][1], oNord = punti[0][1];
  for (const [lon, lat] of punti) {
    if (lon < oOvest) oOvest = lon;
    if (lon > oEst) oEst = lon;
    if (lat < oSud) oSud = lat;
    if (lat > oNord) oNord = lat;
  }
  // Un territorio di 35 m di raggio darebbe un riquadro degenere: lo si allarga.
  const MINIMO = 0.0012; // ~130 m
  if (oEst - oOvest < MINIMO) {
    const c = (oEst + oOvest) / 2;
    oOvest = c - MINIMO / 2; oEst = c + MINIMO / 2;
  }
  if (oNord - oSud < MINIMO) {
    const c = (oNord + oSud) / 2;
    oSud = c - MINIMO / 2; oNord = c + MINIMO / 2;
  }
  return [[oOvest, oSud], [oEst, oNord]];
}

/** Distanza approssimata in metri — serve solo a ordinare i vicini di un pin. */
export function distanzaApprossimata(
  a: { latitudine: number; longitudine: number },
  b: { latitudine: number; longitudine: number },
): number {
  const dLat = (a.latitudine - b.latitudine) * 111320;
  const dLon = (a.longitudine - b.longitudine) * 111320 * Math.cos((a.latitudine * Math.PI) / 180);
  return Math.hypot(dLat, dLon);
}
