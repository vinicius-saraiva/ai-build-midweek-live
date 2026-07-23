// Schermata 1 — Lista.
// Si usa in piedi, con una mano, al sole, su rete incostante: ogni attesa oltre
// 200 ms ha uno scheletro E una frase che dice cosa sta succedendo.
// Nessuna cache in memoria: ogni cambio di filtro è una richiesta nuova (scelta
// di prodotto — i contatori devono dire la verità sul risultato corrente).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Contatori, Filtri, Paziente } from '../dati/contratto';
import { leggiContatori, leggiLista } from '../dati/api';
import { azzera, quantiAttivi, urlDaFiltri } from '../stato/filtriUrl';
import BarraFiltri from '../componenti/BarraFiltri';
import Cerca from '../componenti/Cerca';
import RigaPaziente from '../componenti/RigaPaziente';

export default function Lista(props: {
  filtri: Filtri;
  oggi: string;
  onFiltri: (f: Filtri) => void;
  onApriPaziente: (id: string) => void;
  onVaiAllaMappa: () => void;
}) {
  const { filtri, oggi, onFiltri, onApriPaziente, onVaiAllaMappa } = props;

  const [righe, setRighe] = useState<Paziente[]>([]);
  const [pagina, setPagina] = useState(0);
  const [fine, setFine] = useState(false);
  const [caricaPrima, setCaricaPrima] = useState(true);
  const [caricaAltro, setCaricaAltro] = useState(false);
  const [contatori, setContatori] = useState<Contatori | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  // I filtri sono un oggetto nuovo a ogni render del padre: la chiave stabile è
  // la loro serializzazione, la stessa che vive nell'URL.
  const chiave = useMemo(() => urlDaFiltri(filtri), [filtri]);
  const rifFiltri = useRef(filtri);
  rifFiltri.current = filtri;
  const rifChiave = useRef(chiave);
  rifChiave.current = chiave;

  // --- prima pagina + contatori: due chiamate in parallelo a ogni cambio filtro
  useEffect(() => {
    let annullato = false;
    setRighe([]);
    setPagina(0);
    setFine(false);
    setContatori(null);
    setErrore(null);
    setCaricaPrima(true);
    setCaricaAltro(false);

    const f = rifFiltri.current;

    leggiLista(f, 0).then(
      (p) => {
        if (annullato) return;
        setRighe(p.righe);
        setFine(p.fine);
        setCaricaPrima(false);
      },
      (e: unknown) => {
        if (annullato) return;
        setErrore(messaggio(e));
        setCaricaPrima(false);
      },
    );

    leggiContatori(f).then(
      (c) => { if (!annullato) setContatori(c); },
      () => { /* i contatori non fanno fallire la lista: restano in attesa */ },
    );

    return () => { annullato = true; };
  }, [chiave]);

  // --- pagine successive
  const altraPagina = useCallback(() => {
    if (caricaPrima || caricaAltro || fine || errore) return;
    const chiaveAllora = rifChiave.current;
    const prossima = pagina + 1;
    setCaricaAltro(true);
    leggiLista(rifFiltri.current, prossima).then(
      (p) => {
        // I filtri possono essere cambiati mentre la pagina viaggiava.
        if (rifChiave.current !== chiaveAllora) return;
        setRighe((r) => [...r, ...p.righe]);
        setFine(p.fine);
        setPagina(prossima);
        setCaricaAltro(false);
      },
      (e: unknown) => {
        if (rifChiave.current !== chiaveAllora) return;
        setErrore(messaggio(e));
        setCaricaAltro(false);
      },
    );
  }, [caricaPrima, caricaAltro, fine, errore, pagina]);

  // Scorrimento infinito: si carica quando la sentinella entra nello schermo,
  // con un margine perché la pagina dopo sia già lì quando ci arriva il pollice.
  const sentinella = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const nodo = sentinella.current;
    if (!nodo) return;
    const osservatore = new IntersectionObserver(
      (voci) => { if (voci.some((v) => v.isIntersecting)) altraPagina(); },
      { rootMargin: '400px 0px' },
    );
    osservatore.observe(nodo);
    return () => osservatore.disconnect();
  }, [altraPagina]);

  const attivi = quantiAttivi(filtri);
  const vuota = !caricaPrima && !errore && righe.length === 0;

  // Una frase sola, letta ad alta voce dai lettori di schermo e visibile in coda.
  const annuncio = caricaPrima
    ? 'Carico i pazienti…'
    : errore
      ? 'Caricamento non riuscito.'
      : caricaAltro
        ? 'Carico altri pazienti…'
        : vuota
          ? 'Nessun paziente con questi filtri.'
          : `${righe.length} pazienti caricati${fine ? '' : ', altri in arrivo'}.`;

  return (
    <div className="flex min-h-full flex-col bg-carta">
      {/* Testata ferma: ricerca + una sola riga di filtri */}
      <div className="sticky top-0 z-20 border-b border-nebbia bg-carta">
        <div className="px-3 pb-1 pt-2">
          <Cerca
            valore={filtri.cerca ?? ''}
            onCerca={(testo) => onFiltri({ ...filtri, cerca: testo || undefined })}
          />
        </div>
        <BarraFiltri
          filtri={filtri}
          contatori={contatori}
          caricamento={contatori === null}
          onCambia={onFiltri}
        />
      </div>

      <p aria-live="polite" className="sr-only">{annuncio}</p>

      <main className="flex-1">
        {errore !== null ? (
          <div className="px-4 py-8 text-center">
            <p className="text-[16px] font-semibold text-inchiostro">Caricamento non riuscito</p>
            <p className="mt-1 text-[14px] text-grafite">{errore}</p>
            <button
              type="button"
              onClick={() => onFiltri({ ...filtri })}
              className="mt-4 min-h-[44px] w-full rounded-[14px] bg-blu px-4 text-[16px]
                         font-semibold text-white"
            >
              Riprova
            </button>
          </div>
        ) : vuota ? (
          <div className="px-4 py-10 text-center">
            <p className="text-[16px] font-semibold text-inchiostro">
              Nessun paziente con questi filtri
            </p>
            <p className="mt-1 text-[14px] text-grafite">
              Prova a togliere un filtro o a cambiare la ricerca.
            </p>
            {attivi > 0 ? (
              <button
                type="button"
                onClick={() => onFiltri(azzera(filtri))}
                className="mt-4 min-h-[44px] w-full rounded-[14px] border border-blu bg-blu-tenue
                           px-4 text-[16px] font-semibold text-blu"
              >
                Azzera filtri ({attivi})
              </button>
            ) : null}
          </div>
        ) : (
          <ul className="pb-28">
            {righe.map((p) => (
              <RigaPaziente
                key={p.paziente_id}
                paziente={p}
                oggi={oggi}
                onApri={onApriPaziente}
              />
            ))}

            {/* Scheletri in coda: l'attesa ha sempre una forma */}
            {caricaPrima || caricaAltro ? <Scheletri /> : null}

            {!caricaPrima && !caricaAltro && fine && righe.length > 0 ? (
              <li className="px-4 py-6 text-center text-[14px] text-pietra">
                Fine della lista · {righe.length} pazienti
              </li>
            ) : null}

            {/* Sentinella dello scorrimento infinito */}
            <li aria-hidden="true"><div ref={sentinella} className="h-1" /></li>
          </ul>
        )}
      </main>

      {/* Azione principale: flottante in basso a destra, non ruba una riga di lista.
          La lista ha pb-28 perché il pulsante non copra mai l'ultimo paziente. */}
      <button
        type="button"
        onClick={onVaiAllaMappa}
        aria-label="Vedi questi pazienti sulla mappa"
        className="fixed bottom-5 right-4 z-30 flex min-h-[56px] min-w-[56px] items-center gap-2
                   rounded-full bg-blu px-4 text-[16px] font-semibold text-white shadow-lg"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M10 18s6-5.2 6-9.4A6 6 0 0 0 4 8.6C4 12.8 10 18 10 18Z"
            stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <circle cx="10" cy="8.4" r="2.1" stroke="currentColor" strokeWidth="1.8" />
        </svg>
        Mappa
      </button>
    </div>
  );
}

// --------------------------------------------------------------------- utili
const SCHELETRI = Array.from({ length: 6 }, (_, i) => i);

function Scheletri() {
  return (
    <>
      {SCHELETRI.map((i) => (
        <li key={`scheletro-${i}`} className="border-b border-nebbia bg-scheda px-4 py-3">
          <div className="skeleton h-5 w-48" />
          <div className="skeleton mt-2 h-4 w-32" />
          <div className="skeleton mt-2 h-4 w-40" />
        </li>
      ))}
      <li className="px-4 py-3 text-center text-[14px] text-grafite">
        Carico i pazienti…
      </li>
    </>
  );
}

function messaggio(e: unknown): string {
  return e instanceof Error ? e.message : 'Errore di rete';
}
