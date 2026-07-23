// Riga della lista — deve disambiguare l'omonimo: l'81% dei pazienti condivide
// nome e cognome. Quindi sempre nome + cognome, età e quota, poi lo stato.
// Mai un trattino al posto di "Mai visitato", mai il colore da solo per uno stato.

import type { Paziente } from '../dati/contratto';
import { dataItaliana, etichettaDislivello, etichettaUltimaVisita } from '../dati/contratto';

export default function RigaPaziente(props: {
  paziente: Paziente;
  oggi: string;
  onApri: (id: string) => void;
}) {
  const { paziente: p, oggi, onApri } = props;

  const maiVisitato = p.ultima_visita === null;
  const urgente = p.ps_scoperto_il !== null;

  return (
    <li>
      <button
        type="button"
        onClick={() => onApri(p.paziente_id)}
        className="flex min-h-[44px] w-full flex-col items-start gap-1 border-b border-nebbia
                   bg-scheda px-4 py-3 text-left"
      >
        {/* 1. Chi è: nome, cognome — e subito i due dati che sciolgono l'omonimia */}
        <span className="text-[17px] font-semibold leading-tight text-inchiostro">
          {p.nome} {p.cognome}
        </span>
        <span className="text-[14px] leading-tight text-grafite">
          {p.fascia_eta} anni · quota {Math.round(p.quota_m)} m
        </span>

        {/* 2. Stato della visita: icona o etichetta, mai solo un colore */}
        <span
          className={
            'flex items-center gap-1 text-[14px] leading-tight ' +
            (maiVisitato ? 'font-semibold text-attenzione' : 'text-grafite')
          }
        >
          {maiVisitato ? (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.6" />
              <path d="M8 4.5v4.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="8" cy="11.4" r="1" fill="currentColor" />
            </svg>
          ) : null}
          {etichettaUltimaVisita(p, oggi)}
        </span>

        {/* 3. Quanto costa arrivarci: il dislivello con segno */}
        <span className="text-[14px] leading-tight text-pietra">
          {etichettaDislivello(p.dislivello_m)}
        </span>

        {/* 4. Urgenza: icona + testo, non basta il rosso */}
        {urgente ? (
          <span className="mt-1 flex items-center gap-1 rounded-[14px] bg-terra-tenue px-2 py-1
                           text-[14px] font-semibold leading-tight text-urgenza">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 1.8 15 14H1L8 1.8Z" stroke="currentColor" strokeWidth="1.6"
                strokeLinejoin="round" />
              <path d="M8 6v3.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="8" cy="11.7" r="1" fill="currentColor" />
            </svg>
            PS non ricontattato · {dataItaliana(p.ps_scoperto_il)}
          </span>
        ) : null}
      </button>
    </li>
  );
}
