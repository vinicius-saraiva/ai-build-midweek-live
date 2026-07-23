// Barra filtri — UNA SOLA RIGA che scorre in orizzontale (.riga-filtri).
// Mai chip impilati su più righe: tre righe di chip mangiano mezzo schermo.
// Interruttori a un tocco per i sì/no, foglio dal basso per le scelte multiple.

import { useState } from 'react';
import type { BandaQuota, Condizione, Contatori, FasciaEta, Filtri } from '../dati/contratto';
import { BANDE_QUOTA, CONDIZIONI, FASCE_ETA } from '../dati/contratto';
import FoglioFiltri from './FoglioFiltri';
import type { OpzioneFoglio } from './FoglioFiltri';

type Gruppo = 'condizioni' | 'eta' | 'quota';

const ETICHETTA_CONDIZIONE: Record<Condizione, string> = {
  iperteso: 'Iperteso',
  diabetico: 'Diabetico',
  gravidanza: 'In gravidanza',
};

const ETICHETTA_ETA: Record<FasciaEta, string> = {
  '0-6': '0-6 anni',
  '6-18': '6-18 anni',
  '19-45': '19-45 anni',
  '45-65': '45-65 anni',
  '66+': '66 anni e oltre',
};

const ETICHETTA_QUOTA: Record<BandaQuota, string> = {
  '0-50': 'Fino a 50 m',
  '50-100': 'Da 50 a 100 m',
  '100-150': 'Da 100 a 150 m',
  '150+': 'Oltre 150 m',
};

const TITOLO_GRUPPO: Record<Gruppo, string> = {
  condizioni: 'Condizioni',
  eta: 'Età',
  quota: 'Quota',
};

/** Numero mostrato sul chip, oppure null se i contatori non sono ancora arrivati. */
function somma(valori: (number | undefined)[]): number | null {
  let t = 0;
  for (const v of valori) { if (v === undefined) return null; t += v; }
  return t;
}

export default function BarraFiltri(props: {
  filtri: Filtri;
  contatori: Contatori | null;
  caricamento: boolean;
  onCambia: (f: Filtri) => void;
}) {
  const { filtri, contatori, caricamento, onCambia } = props;
  const [foglio, setFoglio] = useState<Gruppo | null>(null);

  function invertiInterruttore(chiave: 'maiVisitato' | 'psNonRicontattato' | 'nonVistoDa90' | 'vulnerabile') {
    onCambia({ ...filtri, [chiave]: filtri[chiave] ? undefined : true });
  }

  // --- opzioni dei fogli, con il conteggio di ciascuna voce
  function opzioniGruppo(g: Gruppo): OpzioneFoglio[] {
    if (g === 'condizioni') {
      return CONDIZIONI.map((c) => ({
        valore: c,
        etichetta: ETICHETTA_CONDIZIONE[c],
        conteggio: contatori ? contatori[c] : null,
      }));
    }
    if (g === 'eta') {
      return FASCE_ETA.map((f) => ({
        valore: f,
        etichetta: ETICHETTA_ETA[f],
        conteggio: contatori ? contatori.eta[f] : null,
      }));
    }
    return BANDE_QUOTA.map((z) => ({
      valore: z,
      etichetta: ETICHETTA_QUOTA[z],
      conteggio: contatori ? contatori.quota[z] : null,
    }));
  }

  function selezioneGruppo(g: Gruppo): string[] {
    return (filtri[g] ?? []) as string[];
  }

  function applicaGruppo(g: Gruppo, selezione: string[]) {
    const vuota = selezione.length === 0;
    if (g === 'condizioni') onCambia({ ...filtri, condizioni: vuota ? undefined : (selezione as Condizione[]) });
    else if (g === 'eta') onCambia({ ...filtri, eta: vuota ? undefined : (selezione as FasciaEta[]) });
    else onCambia({ ...filtri, quota: vuota ? undefined : (selezione as BandaQuota[]) });
    setFoglio(null);
  }

  /**
   * Contatore del chip di gruppo: somma delle voci scelte quando una scelta c'è,
   * altrimenti somma di tutte le voci del gruppo (la portata della dimensione).
   */
  function conteggioGruppo(g: Gruppo): number | null {
    if (!contatori) return null;
    const scelte = selezioneGruppo(g);
    const opzioni = opzioniGruppo(g);
    const attive = scelte.length ? opzioni.filter((o) => scelte.includes(o.valore)) : opzioni;
    return somma(attive.map((o) => o.conteggio ?? undefined));
  }

  return (
    <>
      <div
        className="riga-filtri flex w-full gap-2 whitespace-nowrap px-3 py-2"
        role="group"
        aria-label="Filtri"
      >
        <Chip
          etichetta="Mai visitato"
          attivo={!!filtri.maiVisitato}
          conteggio={contatori ? contatori.maiVisitato : null}
          caricamento={caricamento}
          onTocco={() => invertiInterruttore('maiVisitato')}
        />
        <Chip
          etichetta="PS non ricontattato"
          attivo={!!filtri.psNonRicontattato}
          conteggio={contatori ? contatori.psNonRicontattato : null}
          caricamento={caricamento}
          onTocco={() => invertiInterruttore('psNonRicontattato')}
        />
        <Chip
          etichetta="Non visto da >90gg"
          attivo={!!filtri.nonVistoDa90}
          conteggio={contatori ? contatori.nonVistoDa90 : null}
          caricamento={caricamento}
          onTocco={() => invertiInterruttore('nonVistoDa90')}
        />
        <Chip
          etichetta="Vulnerabilità"
          attivo={!!filtri.vulnerabile}
          conteggio={contatori ? contatori.vulnerabile : null}
          caricamento={caricamento}
          onTocco={() => invertiInterruttore('vulnerabile')}
        />

        {(['condizioni', 'eta', 'quota'] as Gruppo[]).map((g) => (
          <Chip
            key={g}
            etichetta={TITOLO_GRUPPO[g]}
            attivo={selezioneGruppo(g).length > 0}
            conteggio={conteggioGruppo(g)}
            caricamento={caricamento}
            conFoglio
            onTocco={() => setFoglio(g)}
          />
        ))}
      </div>

      {foglio !== null ? (
        <FoglioFiltri
          titolo={TITOLO_GRUPPO[foglio]}
          opzioni={opzioniGruppo(foglio)}
          selezione={selezioneGruppo(foglio)}
          onAnnulla={() => setFoglio(null)}
          onApplica={(s) => applicaGruppo(foglio, s)}
        />
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------- chip
function Chip(props: {
  etichetta: string;
  attivo: boolean;
  conteggio: number | null;
  caricamento: boolean;
  conFoglio?: boolean;
  onTocco: () => void;
}) {
  const { etichetta, attivo, conteggio, caricamento, conFoglio, onTocco } = props;

  return (
    <button
      type="button"
      onClick={onTocco}
      aria-pressed={conFoglio ? undefined : attivo}
      aria-haspopup={conFoglio ? 'dialog' : undefined}
      className={
        'flex min-h-[44px] shrink-0 items-center gap-2 rounded-full border px-3 text-[15px] ' +
        (attivo
          ? 'border-blu bg-blu-tenue font-semibold text-blu'
          : 'border-nebbia bg-scheda text-grafite')
      }
    >
      {/* Stato attivo: mai il colore da solo, c'è anche il segno di spunta */}
      {attivo ? (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="2.4"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}

      <span>{etichetta}</span>

      {/* Larghezza riservata: il numero che arriva non sposta la riga */}
      {conteggio === null || caricamento ? (
        <span className="skeleton h-4 w-8" aria-hidden="true" />
      ) : (
        <span className="tabular-nums">{conteggio}</span>
      )}

      {conFoglio ? (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </button>
  );
}
