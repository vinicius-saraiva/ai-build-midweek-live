// Selettore ACS — 98 nomi. Foglio dal basso CON RICERCA.
// Un <select> nativo con 98 voci su Android è inservibile: qui non ce n'è
// nessuno, né qui né altrove nel progetto.
//
// Scegliere un ACS imposta l'équipe: i pazienti di un ACS sono quelli della
// sua équipe. Per questo ogni nome mostra sempre anche l'équipe — fra 98
// persone il solo nome non basta a capire se hai toccato quella giusta.

import { useDeferredValue, useMemo, useState } from 'react';
import type { Equipe, Professionista } from '../dati/contratto';
import FoglioDalBasso from './FoglioDalBasso';
import { nomeCompleto } from './nomi';

type Props = {
  aperto: boolean;
  professionisti: Professionista[];
  equipePerId: Map<string, Equipe>;
  scelto: Professionista | null;
  onScegli: (p: Professionista) => void;
  onChiudi: () => void;
};

// Creata una volta sola: dentro la funzione sarebbe un oggetto nuovo a ogni
// nome, cioè 98 per lettera digitata.
const SEGNI = /\p{Diacritic}/gu;

/** Senza accenti e minuscolo: si cerca "goncalves" e si trova "Gonçalves". */
function normalizza(s: string): string {
  return s.normalize('NFD').replace(SEGNI, '').toLowerCase();
}

export default function SelettoreACS({
  aperto, professionisti, equipePerId, scelto, onScegli, onChiudi,
}: Props) {
  const [testo, setTesto] = useState('');
  // La lista si ridisegna in ritardo rispetto alla digitazione: su un telefono
  // lento è la differenza fra scrivere e aspettare.
  const testoDifferito = useDeferredValue(testo);

  const ordinati = useMemo(
    () => [...professionisti].sort((a, b) =>
      nomeCompleto(a).localeCompare(nomeCompleto(b), 'it')),
    [professionisti],
  );

  const risultati = useMemo(() => {
    const q = normalizza(testoDifferito.trim());
    if (!q) return ordinati;
    return ordinati.filter((p) => {
      const eq = equipePerId.get(p.equipe_id);
      return normalizza(`${nomeCompleto(p)} ${eq?.equipe_nome ?? ''}`).includes(q);
    });
  }, [ordinati, testoDifferito, equipePerId]);

  return (
    <FoglioDalBasso
      aperto={aperto}
      titolo="Chi sta lavorando"
      descrizione="Scegli il tuo nome: i pazienti sono quelli della tua équipe"
      onChiudi={onChiudi}
    >
      <div className="sticky top-0 z-10 border-b border-nebbia bg-scheda px-4 py-3">
        <label className="sr-only" htmlFor="cerca-acs">Cerca un ACS per nome</label>
        <div className="flex items-center gap-2 rounded-xl border border-nebbia bg-carta px-3">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0 text-pietra">
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" fill="none" />
            <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            id="cerca-acs"
            type="search"
            inputMode="search"
            autoComplete="off"
            value={testo}
            onChange={(e) => setTesto(e.target.value)}
            placeholder="Cerca il tuo nome"
            className="h-tocco min-w-0 flex-1 bg-transparent text-[16px] text-inchiostro
                       outline-none placeholder:text-pietra"
          />
          {testo.length > 0 && (
            <button
              type="button"
              onClick={() => setTesto('')}
              aria-label="Cancella la ricerca"
              className="-mr-2 flex h-tocco w-tocco shrink-0 items-center justify-center text-grafite"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" fill="none" />
              </svg>
            </button>
          )}
        </div>
        <p aria-live="polite" className="mt-2 text-[13px] text-grafite">
          {risultati.length === 1 ? '1 persona' : `${risultati.length} persone`}
        </p>
      </div>

      {risultati.length === 0 ? (
        <p className="px-4 py-8 text-center text-[15px] text-grafite">
          Nessun nome corrisponde a «{testo.trim()}».
        </p>
      ) : (
        <ul className="pb-2">
          {risultati.map((p) => {
            const eq = equipePerId.get(p.equipe_id);
            const attivo = scelto?.professionista_id === p.professionista_id;
            return (
              <li key={p.professionista_id}>
                <button
                  type="button"
                  onClick={() => onScegli(p)}
                  aria-current={attivo ? 'true' : undefined}
                  className={`flex min-h-tocco w-full items-center gap-3 border-b border-nebbia
                              px-4 py-3 text-left active:bg-blu-tenue
                              ${attivo ? 'bg-blu-tenue' : ''}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[16px] text-inchiostro">
                      {nomeCompleto(p)}
                    </span>
                    <span className="block truncate text-[13px] text-grafite">
                      {eq ? `${eq.equipe_nome} · ${eq.area}` : 'Équipe non trovata'}
                    </span>
                  </span>
                  {/* Mai il colore da solo: il selezionato ha anche una spunta. */}
                  {attivo && (
                    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"
                         className="shrink-0 text-blu">
                      <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.4"
                            strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  )}
                  {attivo && <span className="sr-only">selezionato</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </FoglioDalBasso>
  );
}
