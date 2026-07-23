// Nastro di schede — modello Wellhub.
//
// Si tocca un pin, compare la scheda; le schede scorrono in orizzontale con
// scroll-snap e la mappa segue la selezione. Toccando la scheda si apre il
// dettaglio del paziente.
//
// Il componente disegna SOLO la pista delle schede: la posizione in basso e i
// comandi (chiudi, pulsante flottante) li mette Mappa.tsx, così il nastro e il
// flottante non si sovrappongono mai.

import { useEffect, useRef } from 'react';
import type { PazienteMappa } from '../dati/contratto';
import { giorniDa } from '../dati/contratto';
import { coloreQuota } from '../mappa/pin';

type Props = {
  pazienti: PazienteMappa[];
  selezionato: string | null;
  oggi: string;
  /** Lo scorrimento ha portato in centro un'altra scheda: la mappa la segue. */
  onSeleziona: (paziente_id: string) => void;
  onApri: (paziente_id: string) => void;
};

/** Come `etichettaUltimaVisita`, ma sulla proiezione leggera della mappa. */
function etichettaVisita(p: PazienteMappa, oggi: string): string {
  const g = giorniDa(p.ultima_visita, oggi);
  if (g === null) return 'Mai visitato';
  if (g === 0) return 'Visitato oggi';
  if (g === 1) return 'Visitato ieri';
  if (g < 30) return `Visitato ${g} giorni fa`;
  const mesi = Math.floor(g / 30);
  return `Visitato ${mesi} ${mesi === 1 ? 'mese' : 'mesi'} fa`;
}

export default function NastroSchede({
  pazienti, selezionato, oggi, onSeleziona, onApri,
}: Props) {
  const pista = useRef<HTMLDivElement | null>(null);
  // Evita il rimbalzo: mentre allineiamo noi, non riportiamo indietro la selezione.
  const allineamento = useRef(false);

  const indice = pazienti.findIndex((p) => p.paziente_id === selezionato);

  // La selezione arriva da fuori (un pin toccato): porta la scheda al centro.
  useEffect(() => {
    const el = pista.current;
    if (!el || indice < 0) return;
    const scheda = el.children[indice] as HTMLElement | undefined;
    if (!scheda) return;
    const meta = scheda.offsetLeft - (el.clientWidth - scheda.clientWidth) / 2;
    if (Math.abs(el.scrollLeft - meta) < 4) return;
    allineamento.current = true;
    el.scrollTo({ left: meta, behavior: 'smooth' });
    const t = setTimeout(() => { allineamento.current = false; }, 450);
    return () => clearTimeout(t);
  }, [indice]);

  // Lo scorrimento manuale cambia la selezione; poi la mappa si ricentra.
  function alloScorrere() {
    const el = pista.current;
    if (!el || allineamento.current) return;
    const centro = el.scrollLeft + el.clientWidth / 2;
    let migliore = 0;
    let minimo = Infinity;
    for (let i = 0; i < el.children.length; i++) {
      const scheda = el.children[i] as HTMLElement;
      const d = Math.abs(scheda.offsetLeft + scheda.clientWidth / 2 - centro);
      if (d < minimo) { minimo = d; migliore = i; }
    }
    const p = pazienti[migliore];
    if (p && p.paziente_id !== selezionato) onSeleziona(p.paziente_id);
  }

  if (pazienti.length === 0) return null;

  return (
    <div
      ref={pista}
      onScroll={alloScorrere}
      aria-label="Pazienti vicini al punto toccato"
      className="riga-filtri pointer-events-auto flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1"
    >
      {pazienti.map((p) => {
        const attiva = p.paziente_id === selezionato;
        const psAperto = p.ps_scoperto_il != null;
        return (
          <button
            key={p.paziente_id}
            type="button"
            onClick={() => onApri(p.paziente_id)}
            aria-current={attiva ? 'true' : undefined}
            className={
              'w-[80vw] max-w-[300px] shrink-0 snap-center rounded-scheda border bg-scheda p-3 text-left ' +
              (attiva ? 'border-blu' : 'border-nebbia')
            }
          >
            <div className="flex items-start gap-2">
              <span
                aria-hidden="true"
                className={'mt-1.5 h-3.5 w-3.5 shrink-0 ' + (psAperto ? 'rotate-45' : 'rounded-full')}
                style={{
                  background: coloreQuota(p.quota_m),
                  outline: psAperto ? '2px solid var(--color-urgenza)' : 'none',
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[17px] leading-tight font-semibold text-inchiostro">
                  {p.nome} {p.cognome}
                </p>
                <p className="mt-1 text-[14px] text-grafite">
                  {p.quota_m} m di quota · {etichettaVisita(p, oggi)}
                </p>
                {psAperto ? (
                  <p className="mt-1 inline-block rounded-md bg-terra-tenue px-2 py-0.5 text-[13px] font-semibold text-urgenza">
                    PS non ricontattato
                  </p>
                ) : null}
              </div>
            </div>
            <p className="mt-2 text-[13px] font-semibold text-blu">Apri la scheda →</p>
          </button>
        );
      })}
    </div>
  );
}
