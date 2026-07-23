// Schermata 3 — Scheda paziente.
// Sola lettura: nessun pulsante che scrive, nessun "segna visita".
// Si legge in piedi, con una mano, a 390 px: una colonna sola, niente
// scorrimento orizzontale, aree di tocco ≥ 44 px.

import { useCallback, useEffect, useState } from 'react';
import type { JSX, ReactNode } from 'react';
import type { SchedaPaziente } from '../dati/contratto';
import {
  dataItaliana,
  etichettaDislivello,
  etichettaUltimaVisita,
  giorniDa,
} from '../dati/contratto';
import { leggiScheda } from '../dati/api';
import Condizioni from '../componenti/Condizioni';
import Timeline from '../componenti/Timeline';

// ---------------------------------------------------------------- pezzi comuni

function Sezione(props: { titolo: string; children: ReactNode }) {
  return (
    <section className="rounded-scheda border border-nebbia bg-scheda p-4">
      <h2 className="m-0 mb-3 text-[13px] font-semibold tracking-wide text-pietra uppercase">
        {props.titolo}
      </h2>
      {props.children}
    </section>
  );
}

function IconaIndietro() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

function IconaMappa() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

/** Barra in cima: torna indietro. Sempre visibile, anche durante l'attesa. */
function Barra(props: { onChiudi: () => void }) {
  return (
    <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-nebbia bg-carta px-2 py-1">
      <button
        type="button"
        onClick={props.onChiudi}
        aria-label="Torna indietro"
        className="flex h-tocco min-w-tocco items-center gap-1 rounded-scheda px-2 text-[15px] font-semibold text-blu"
      >
        <IconaIndietro />
        <span>Indietro</span>
      </button>
    </div>
  );
}

/** Attesa oltre 200 ms: mai muta. Skeleton + testo annunciato. */
function Attesa() {
  return (
    <div className="p-4" aria-busy="true">
      <p aria-live="polite" className="sr-only">
        Caricamento della scheda in corso
      </p>
      <div className="skeleton h-7 w-3/4" />
      <div className="skeleton mt-2 h-5 w-1/2" />
      <div className="skeleton mt-4 h-28 w-full" />
      <div className="skeleton mt-3 h-24 w-full" />
      <div className="skeleton mt-3 h-56 w-full" />
      <p className="mt-4 text-[15px] text-grafite">Caricamento della scheda…</p>
    </div>
  );
}

function Errore(props: { messaggio: string; onRiprova: () => void }) {
  return (
    <div className="p-4">
      <p aria-live="polite" className="text-[16px] text-inchiostro">
        Non è stato possibile caricare la scheda.
      </p>
      <p className="mt-1 text-[14px] text-grafite break-words">{props.messaggio}</p>
      <button
        type="button"
        onClick={props.onRiprova}
        className="mt-4 min-h-tocco w-full rounded-scheda bg-blu px-4 text-[16px] font-semibold text-carta"
      >
        Riprova
      </button>
    </div>
  );
}

// ---------------------------------------------------------------- schermata

export default function Scheda(props: {
  pazienteId: string;
  oggi: string;
  onChiudi: () => void;
  onVaiAllaMappa: (id: string) => void;
}): JSX.Element {
  const { pazienteId } = props;
  const [dati, setDati] = useState<SchedaPaziente | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [tentativo, setTentativo] = useState(0);

  useEffect(() => {
    let vivo = true;
    setDati(null);
    setErrore(null);
    leggiScheda(pazienteId)
      .then((s) => {
        if (vivo) setDati(s);
      })
      .catch((e: unknown) => {
        if (vivo) setErrore(e instanceof Error ? e.message : 'Errore sconosciuto');
      });
    return () => {
      vivo = false;
    };
  }, [pazienteId, tentativo]);

  const riprova = useCallback(() => setTentativo((n) => n + 1), []);

  if (errore !== null) {
    return (
      <div className="min-h-full bg-carta">
        <Barra onChiudi={props.onChiudi} />
        <Errore messaggio={errore} onRiprova={riprova} />
      </div>
    );
  }

  if (dati === null) {
    return (
      <div className="min-h-full bg-carta">
        <Barra onChiudi={props.onChiudi} />
        <Attesa />
      </div>
    );
  }

  const p = dati.paziente;

  // 5. Ultimo appuntamento specialistico — al PASSATO, ricavato dalla timeline.
  //    Nei dati non esiste nulla nel futuro: mai scrivere "prossimo".
  const specialistiche = dati.timeline
    .filter((v) => v.tipo === 'visita-specialistica-prenotata')
    .toSorted((x, y) => (x.data < y.data ? 1 : -1));
  const ultimaSpecialistica = specialistiche[0]?.data ?? null;

  const giorniPsScoperto = giorniDa(p.ps_scoperto_il, props.oggi);

  return (
    <div className="min-h-full bg-carta pb-6">
      <Barra onChiudi={props.onChiudi} />

      <div className="flex flex-col gap-3 p-3">
        {/* 1. Identità — la quota serve a confermare "è questa Maria":
            l'81% dei pazienti ha un omonimo. */}
        <header className="rounded-scheda border border-nebbia bg-scheda p-4">
          <h1 className="m-0 text-[24px] leading-tight font-bold text-inchiostro break-words">
            {p.nome} {p.cognome}
          </h1>
          <p className="mt-1 text-[16px] text-grafite">
            {p.sesso} · {p.fascia_eta} anni
          </p>
          <p className="mt-1 text-[15px] text-grafite">
            Quota {Math.round(p.quota_m)} m · {etichettaDislivello(Math.round(p.dislivello_m))}
          </p>
          <p className="mt-1 text-[14px] text-pietra">
            {p.equipe_nome} · {p.area}
          </p>
        </header>

        {/* 2. Condizioni */}
        <Sezione titolo="Condizioni">
          <Condizioni paziente={p} />
        </Sezione>

        {/* 3. Ultima visita e numero di visite */}
        <Sezione titolo="Visite dell'ACS">
          <p className="m-0 text-[18px] font-semibold text-inchiostro">
            {etichettaUltimaVisita(p, props.oggi)}
          </p>
          <p className="mt-1 text-[15px] text-grafite">
            {p.ultima_visita === null
              ? 'Nessuna visita registrata'
              : `Ultima visita il ${dataItaliana(p.ultima_visita)}`}
          </p>
          <p className="mt-1 text-[15px] text-grafite">
            {p.n_visite === 1 ? '1 visita in totale' : `${p.n_visite} visite in totale`}
          </p>
        </Sezione>

        {/* 4. Pronto soccorso — l'informazione più azionabile della scheda */}
        <Sezione titolo="Pronto soccorso">
          <p className="m-0 text-[18px] font-semibold text-inchiostro">
            {p.n_ps_totale === 0
              ? 'Nessun accesso registrato'
              : p.n_ps_totale === 1
                ? '1 accesso'
                : `${p.n_ps_totale} accessi`}
          </p>
          {p.ultimo_ps !== null ? (
            <p className="mt-1 text-[15px] text-grafite">
              Ultimo accesso il {dataItaliana(p.ultimo_ps)}
            </p>
          ) : null}

          {p.ps_scoperto_il !== null ? (
            <p className="mt-3 rounded-scheda border border-urgenza bg-terra-tenue p-3 text-[15px] font-semibold text-urgenza">
              ⚠ Dopo l&apos;accesso del {dataItaliana(p.ps_scoperto_il)} non risulta
              nessuna visita
              {giorniPsScoperto === null ? '' : ` (${giorniPsScoperto} giorni)`}.
            </p>
          ) : null}
        </Sezione>

        {/* 5. Ultimo appuntamento specialistico — al passato, mai "prossimo" */}
        <Sezione titolo="Visite specialistiche">
          <p className="m-0 text-[16px] text-inchiostro">
            {ultimaSpecialistica === null
              ? 'Nessuna visita specialistica registrata'
              : `Ultima visita specialistica il ${dataItaliana(ultimaSpecialistica)}`}
          </p>
        </Sezione>

        {/* 6. Timeline unica */}
        <Sezione titolo="Storico">
          <Timeline voci={dati.timeline} oggi={props.oggi} />
        </Sezione>

        {/* 7. Verso la mappa, centrata su questo paziente */}
        <button
          type="button"
          onClick={() => props.onVaiAllaMappa(pazienteId)}
          className="flex min-h-tocco w-full items-center justify-center gap-2 rounded-scheda bg-blu px-4 text-[16px] font-semibold text-carta"
        >
          <IconaMappa />
          <span>Vedi sulla mappa</span>
        </button>
      </div>
    </div>
  );
}
