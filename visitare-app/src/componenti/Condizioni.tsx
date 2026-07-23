// Etichette delle condizioni cliniche e sociali del paziente.
// Regola non negoziabile: mai il colore da solo — sempre icona + testo.
// Il 76% dei pazienti non ha nessuna condizione: il caso "vuoto" è dichiarato,
// non è un'assenza silenziosa.

import type { JSX } from 'react';
import type { Paziente } from '../dati/contratto';

type Tono = 'blu' | 'verde' | 'terracotta' | 'attenzione';

const TONO: Record<Tono, string> = {
  blu: 'bg-blu-tenue text-blu border-blu',
  verde: 'bg-verde-tenue text-verde border-verde',
  terracotta: 'bg-terra-tenue text-terracotta border-terracotta',
  attenzione: 'bg-terra-tenue text-attenzione border-attenzione',
};

/** Icone: tratto singolo, nessun riempimento, così restano leggibili al sole. */
function IconaCuore() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20s-7-4.6-7-9.4A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.6C19 15.4 12 20 12 20z" />
    </svg>
  );
}

function IconaGoccia() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3.5 6.8 10a6.4 6.4 0 1 0 10.4 0z" />
    </svg>
  );
}

function IconaGravidanza() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="4.5" r="2.5" />
      <path d="M12 7.5v13" />
      <path d="M12 10c3 0 4.5 1.6 4.5 3.5S15 17 12 17" />
    </svg>
  );
}

function IconaScudo() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3 5 6v5.5c0 4.2 3 7.6 7 9.5 4-1.9 7-5.3 7-9.5V6z" />
      <path d="M12 9v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}

function Etichetta(props: { tono: Tono; icona: JSX.Element; testo: string }) {
  return (
    <li
      className={`flex items-center gap-2 rounded-full border px-3 py-2 text-[15px] font-medium ${TONO[props.tono]}`}
    >
      {props.icona}
      <span>{props.testo}</span>
    </li>
  );
}

export default function Condizioni(props: { paziente: Paziente }): JSX.Element {
  const p = props.paziente;
  const nessuna =
    !p.iperteso && !p.diabetico && !p.gravidanza && !p.vulnerabilita_sociale;

  if (nessuna) {
    return (
      <p className="text-[15px] text-grafite">Nessuna condizione registrata</p>
    );
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {p.iperteso ? (
        <Etichetta tono="terracotta" icona={<IconaCuore />} testo="Iperteso" />
      ) : null}
      {p.diabetico ? (
        <Etichetta tono="blu" icona={<IconaGoccia />} testo="Diabetico" />
      ) : null}
      {p.gravidanza ? (
        <Etichetta tono="verde" icona={<IconaGravidanza />} testo="Gravidanza" />
      ) : null}
      {p.vulnerabilita_sociale ? (
        <Etichetta
          tono="attenzione"
          icona={<IconaScudo />}
          testo="Vulnerabilità sociale"
        />
      ) : null}
    </ul>
  );
}
