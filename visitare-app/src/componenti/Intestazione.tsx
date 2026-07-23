// Intestazione — MASSIMO 2 RIGHE, e non si allarga mai.
//
// Riga 1: marchio + il nome di chi sta lavorando (apre il selettore).
// Riga 2: équipe e area — il contesto che dice "questi pazienti sono i miei".
//
// Nessun numero: quanti pazienti ci sono lo dicono i contatori dei filtri.
// Ripeterlo qui sarebbe rubare una riga di lista per un'informazione già a schermo.

import type { Equipe, Professionista } from '../dati/contratto';
import { nomeCompleto } from './nomi';

type Props = {
  acs: Professionista | null;
  equipe: Equipe | null;
  onApriSelettore: () => void;
  /** Vero mentre arrivano équipe e professionisti: mostra lo scheletro. */
  inCaricamento?: boolean;
};

export default function Intestazione({ acs, equipe, onApriSelettore, inCaricamento }: Props) {
  return (
    <header className="shrink-0 border-b border-nebbia bg-carta px-4 pt-[env(safe-area-inset-top)]">
      {/* Riga 1 */}
      <div className="flex h-tocco items-center gap-2">
        <img src="/visitare-pin.svg" alt="" aria-hidden="true" className="h-6 w-6 shrink-0" />
        <span className="shrink-0 text-[17px] font-semibold tracking-tight text-inchiostro">
          Visitare
        </span>

        <button
          type="button"
          onClick={onApriSelettore}
          disabled={inCaricamento}
          aria-haspopup="dialog"
          className="ml-auto flex h-tocco min-w-0 items-center gap-1 rounded-xl px-2
                     text-right active:bg-blu-tenue disabled:opacity-60"
        >
          <span className="sr-only">Cambia ACS. Adesso:</span>
          {inCaricamento || !acs ? (
            <span className="skeleton h-4 w-24" aria-hidden="true" />
          ) : (
            <span className="min-w-0 truncate text-[15px] font-medium text-blu">
              {nomeCompleto(acs)}
            </span>
          )}
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"
               className="shrink-0 text-blu">
            <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </button>
      </div>

      {/* Riga 2 */}
      <p className="h-5 truncate pb-1 text-[13px] text-grafite">
        {equipe ? `${equipe.equipe_nome} · ${equipe.area}` : (
          <span className="skeleton inline-block h-3 w-40 align-middle" aria-hidden="true" />
        )}
      </p>
    </header>
  );
}
