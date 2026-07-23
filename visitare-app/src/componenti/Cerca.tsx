// Ricerca per nome — attesa di 350 ms dopo l'ultima lettera.
// Si digita camminando: ogni carattere non può diventare una richiesta.

import { useEffect, useRef, useState } from 'react';

const ATTESA_MS = 350;

export default function Cerca(props: {
  valore: string;
  onCerca: (testo: string) => void;
}) {
  const { valore, onCerca } = props;

  // Testo mostrato: locale, così la digitazione resta immediata anche su rete lenta.
  const [testo, setTesto] = useState(valore);
  // Ultimo valore emesso verso l'esterno: serve a capire se un cambio di prop
  // arriva da noi (da ignorare) o da fuori, per esempio da "Azzera filtri".
  const ultimoEmesso = useRef(valore);
  const onCercaRif = useRef(onCerca);
  onCercaRif.current = onCerca;

  useEffect(() => {
    if (valore !== ultimoEmesso.current) {
      ultimoEmesso.current = valore;
      setTesto(valore);
    }
  }, [valore]);

  useEffect(() => {
    if (testo === ultimoEmesso.current) return;
    const t = setTimeout(() => {
      ultimoEmesso.current = testo;
      onCercaRif.current(testo);
    }, ATTESA_MS);
    return () => clearTimeout(t);
  }, [testo]);

  const inAttesa = testo !== ultimoEmesso.current;

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-pietra">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2" />
          <path d="M13.5 13.5 18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>

      <input
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        aria-label="Cerca per nome o cognome"
        placeholder="Cerca per nome"
        value={testo}
        onChange={(e) => setTesto(e.target.value)}
        className="min-h-[44px] w-full rounded-[14px] border border-nebbia bg-scheda
                   pl-10 pr-11 py-2 text-[16px] text-inchiostro placeholder:text-pietra
                   outline-none focus:border-blu"
      />

      {testo !== '' && (
        <button
          type="button"
          aria-label="Cancella la ricerca"
          onClick={() => setTesto('')}
          className="absolute right-0 top-0 flex h-[44px] w-[44px] items-center justify-center
                     text-grafite"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      )}

      {/* L'attesa dei 350 ms non è muta: chi guarda sa che sta per partire. */}
      <p aria-live="polite" className="sr-only">
        {inAttesa ? 'Ricerca in preparazione' : ''}
      </p>
    </div>
  );
}
