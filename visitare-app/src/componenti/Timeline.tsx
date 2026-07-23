// Timeline unica: visite ACS ed eventi clinici nella stessa colonna, in ordine
// di data decrescente. È la parte che dà senso al resto della scheda: si deve
// vedere l'accesso al pronto soccorso e il vuoto che segue.
//
// I tre tipi si distinguono per icona + etichetta testuale. Mai solo colore.

import { useState } from 'react';
import type { JSX } from 'react';
import type { VoceTimeline } from '../dati/contratto';
import { dataItaliana, giorniDa } from '../dati/contratto';

const QUANTE_SUBITO = 15;

type Aspetto = {
  etichetta: string;
  classi: string;   // colore del pallino e dell'icona
  icona: JSX.Element;
};

function IconaCasa() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 11 12 4l8 7" />
      <path d="M6 10v9h12v-9" />
    </svg>
  );
}

function IconaCalendario() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </svg>
  );
}

function IconaCroce() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 6v12M6 12h12" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

const ASPETTO: Record<VoceTimeline['tipo'], Aspetto> = {
  'visita-acs': {
    etichetta: 'Visita ACS',
    classi: 'bg-verde-tenue text-verde border-verde',
    icona: <IconaCasa />,
  },
  'visita-specialistica-prenotata': {
    etichetta: 'Visita specialistica',
    classi: 'bg-blu-tenue text-blu border-blu',
    icona: <IconaCalendario />,
  },
  'accesso-ps-o-ricovero': {
    etichetta: 'Pronto soccorso o ricovero',
    classi: 'bg-terra-tenue text-urgenza border-urgenza',
    icona: <IconaCroce />,
  },
};

/** "3 giorni fa" / "2 mesi fa": derivato da OGGI, mai salvato. */
function quantoFa(data: string, oggi: string): string {
  const g = giorniDa(data, oggi);
  if (g === null) return '';
  if (g <= 0) return 'oggi';
  if (g === 1) return 'ieri';
  if (g < 30) return `${g} giorni fa`;
  const mesi = Math.floor(g / 30);
  return `${mesi} ${mesi === 1 ? 'mese' : 'mesi'} fa`;
}

function Voce(props: { voce: VoceTimeline; oggi: string }) {
  const a = ASPETTO[props.voce.tipo];
  return (
    <li className="relative flex gap-3 pl-1 pb-4">
      {/* pallino sulla linea verticale */}
      <span
        className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${a.classi}`}
      >
        {a.icona}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-inchiostro">
          {a.etichetta}
        </span>
        <span className="block text-[14px] text-grafite">
          {dataItaliana(props.voce.data)} · {quantoFa(props.voce.data, props.oggi)}
        </span>
      </span>
    </li>
  );
}

export default function Timeline(props: {
  voci: VoceTimeline[];
  oggi: string;
}): JSX.Element {
  const [tutto, setTutto] = useState(false);

  if (props.voci.length === 0) {
    return (
      <p className="text-[15px] text-grafite">Nessun evento registrato</p>
    );
  }

  // Le voci arrivano già ordinate dal server; riordiniamo per sicurezza,
  // senza mutare l'array originale.
  const ordinate = props.voci.toSorted((x, y) => (x.data < y.data ? 1 : -1));
  const mostrate = tutto ? ordinate : ordinate.slice(0, QUANTE_SUBITO);
  const nascoste = ordinate.length - mostrate.length;

  return (
    <div>
      <ol className="relative m-0 list-none p-0">
        {/* linea verticale: nasce dietro i pallini */}
        <span
          aria-hidden="true"
          className="absolute top-4 bottom-4 left-4 w-px bg-nebbia"
        />
        {mostrate.map((v, i) => (
          <Voce key={`${v.data}-${v.tipo}-${i}`} voce={v} oggi={props.oggi} />
        ))}
      </ol>

      {nascoste > 0 ? (
        <button
          type="button"
          onClick={() => setTutto(true)}
          className="min-h-tocco w-full rounded-scheda border border-nebbia px-4 text-[15px] font-semibold text-blu"
        >
          Mostra tutto ({nascoste} in più)
        </button>
      ) : null}
    </div>
  );
}
