// Foglio dal basso — componente base riusabile (selettore ACS, filtri a scelta
// multipla). Si apre dal bordo inferiore perché il pollice sta lì.
//
// Regole rispettate: nessun backdrop-blur, una sola transizione semplice,
// aree di tocco ≥ 44 px, chiusura con Esc / velo / pulsante, e il fuoco che
// non scappa fuori dal foglio mentre è aperto.

import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';

type Props = {
  aperto: boolean;
  titolo: string;
  /** Riga sotto il titolo: contesto, non numeri già visibili altrove. */
  descrizione?: string;
  onChiudi: () => void;
  /** Barra fissa in fondo, per esempio il pulsante "Applica". */
  azioni?: ReactNode;
  children: ReactNode;
};

export default function FoglioDalBasso({
  aperto, titolo, descrizione, onChiudi, azioni, children,
}: Props) {
  const idTitolo = useId();
  const pannello = useRef<HTMLDivElement>(null);

  // Esc chiude, e il fuoco resta dentro il foglio finché è aperto.
  useEffect(() => {
    if (!aperto) return;
    const alTasto = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onChiudi(); return; }
      if (e.key !== 'Tab' || !pannello.current) return;
      const fuoco = pannello.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (fuoco.length === 0) return;
      const primo = fuoco[0];
      const ultimo = fuoco[fuoco.length - 1];
      if (e.shiftKey && document.activeElement === primo) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primo.focus(); }
    };
    document.addEventListener('keydown', alTasto);
    // Il fondo non deve scorrere sotto al foglio.
    const primaOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', alTasto);
      document.body.style.overflow = primaOverflow;
    };
  }, [aperto, onChiudi]);

  if (!aperto) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Velo: opacità piena, nessuna sfocatura — i telefoni sono lenti. */}
      <button
        type="button"
        aria-label="Chiudi"
        onClick={onChiudi}
        className="absolute inset-0 bg-inchiostro/45"
      />
      <div
        ref={pannello}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitolo}
        className="relative flex max-h-[85dvh] flex-col rounded-t-[20px] bg-scheda
                   pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_16px_rgba(0,0,0,.18)]"
      >
        <div className="flex shrink-0 items-start gap-2 border-b border-nebbia px-4 pt-3 pb-3">
          <div className="min-w-0 flex-1">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-nebbia" aria-hidden="true" />
            <h2 id={idTitolo} className="truncate text-[17px] font-semibold text-inchiostro">
              {titolo}
            </h2>
            {descrizione && (
              <p className="mt-0.5 truncate text-[13px] text-grafite">{descrizione}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onChiudi}
            aria-label="Chiudi"
            className="-mr-2 mt-1 flex h-tocco w-tocco shrink-0 items-center justify-center
                       rounded-full text-grafite active:bg-nebbia"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" fill="none" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>

        {azioni && (
          <div className="shrink-0 border-t border-nebbia px-4 py-3">{azioni}</div>
        )}
      </div>
    </div>
  );
}
