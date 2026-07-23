// Foglio dal basso a scelta multipla — modello Wellhub.
// Bozza locale + "Applica": N tocchi dentro il foglio = 1 sola richiesta.
// Niente backdrop-blur, niente animazioni: il telefono è lento.

import { useEffect, useState } from 'react';

export type OpzioneFoglio = {
  valore: string;
  etichetta: string;
  /** null mentre i contatori stanno ancora arrivando. */
  conteggio: number | null;
};

export default function FoglioFiltri(props: {
  titolo: string;
  opzioni: OpzioneFoglio[];
  selezione: string[];
  onAnnulla: () => void;
  onApplica: (selezione: string[]) => void;
}) {
  const { titolo, opzioni, selezione, onAnnulla, onApplica } = props;

  // Bozza: nessun tocco qui dentro tocca la rete.
  const [bozza, setBozza] = useState<string[]>(selezione);

  useEffect(() => {
    const chiudi = (e: KeyboardEvent) => { if (e.key === 'Escape') onAnnulla(); };
    document.addEventListener('keydown', chiudi);
    return () => document.removeEventListener('keydown', chiudi);
  }, [onAnnulla]);

  function inverti(valore: string) {
    setBozza((b) => (b.includes(valore) ? b.filter((v) => v !== valore) : [...b, valore]));
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Velo: opacità piena, nessuna sfocatura */}
      <button
        type="button"
        aria-label="Chiudi senza applicare"
        onClick={onAnnulla}
        className="flex-1 bg-inchiostro/40"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={titolo}
        className="max-h-[75vh] overflow-y-auto rounded-t-[14px] border-t border-nebbia bg-scheda"
      >
        <div className="sticky top-0 border-b border-nebbia bg-scheda px-4 pb-2 pt-3">
          <div className="mx-auto mb-3 h-1 w-10 rounded bg-nebbia" aria-hidden="true" />
          <h2 className="text-[17px] font-semibold text-inchiostro">{titolo}</h2>
        </div>

        <ul className="px-2 py-1">
          {opzioni.map((o) => {
            const scelta = bozza.includes(o.valore);
            return (
              <li key={o.valore}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={scelta}
                  onClick={() => inverti(o.valore)}
                  className="flex min-h-[52px] w-full items-center gap-3 rounded-[14px] px-2 text-left"
                >
                  {/* Segno di spunta: forma, non solo colore */}
                  <span
                    aria-hidden="true"
                    className={
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 ' +
                      (scelta ? 'border-blu bg-blu text-scheda' : 'border-pietra text-transparent')
                    }
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="2.4"
                        strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>

                  <span className="flex-1 text-[16px] text-inchiostro">{o.etichetta}</span>

                  {o.conteggio === null
                    ? <span className="skeleton h-4 w-10" aria-hidden="true" />
                    : <span className="text-[15px] tabular-nums text-grafite">{o.conteggio}</span>}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="sticky bottom-0 flex gap-2 border-t border-nebbia bg-scheda px-4 py-3">
          <button
            type="button"
            onClick={onAnnulla}
            className="min-h-[44px] flex-1 rounded-[14px] border border-nebbia bg-scheda
                       text-[16px] font-medium text-grafite"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={() => onApplica(bozza)}
            className="min-h-[44px] flex-[2] rounded-[14px] bg-blu text-[16px] font-semibold text-white"
          >
            Applica{bozza.length > 0 ? ` (${bozza.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
