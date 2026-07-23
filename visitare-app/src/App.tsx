// Guscio dell'app — blocco 5.
//
// Tiene insieme quattro cose e nient'altro:
//   1. chi sta lavorando (selettore ACS) e quindi quale équipe;
//   2. quale delle tre schermate è aperta, con lo stato nell'URL;
//   3. il caricamento iniziale (oggi, équipe, professionisti);
//   4. cosa si vede quando la rete non c'è o Supabase non risponde.
//
// Non c'è libreria di routing: tre schermate e un parametro nell'URL non la
// giustificano. history.pushState + popstate bastano, e il tasto Indietro di
// Android funziona come su qualsiasi altra app.

import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentType } from 'react';

import type { Equipe, Filtri, Professionista } from './dati/contratto';
import { leggiEquipe, leggiOggi, leggiProfessionisti } from './dati/api';
import type { Schermata } from './stato/filtriUrl';
import {
  acsRicordato, filtriRicordati, ricordaAcs, ricordaFiltri, statoDaUrl, urlDaStato,
} from './stato/filtriUrl';

import Intestazione from './componenti/Intestazione';
import SelettoreACS from './componenti/SelettoreACS';
import { nomeCompleto } from './componenti/nomi';

// ---------------------------------------------------------------- schermate
// Le tre schermate le costruiscono altri agenti, in parallelo a questo file.
// import.meta.glob risolve a compilazione senza rompersi se un file non c'è
// ancora: il guscio compila e si apre lo stesso, e al posto della schermata
// mancante compare un cartello onesto invece di uno schermo bianco.

type PropsLista = {
  filtri: Filtri; oggi: string;
  onFiltri: (f: Filtri) => void;
  onApriPaziente: (pazienteId: string) => void;
  onVaiAllaMappa: () => void;
};
type PropsMappa = {
  filtri: Filtri; oggi: string;
  onFiltri: (f: Filtri) => void;
  onApriPaziente: (pazienteId: string) => void;
  onVaiAllaLista: () => void;
};
type PropsScheda = {
  pazienteId: string; oggi: string;
  onChiudi: () => void;
  /** La scheda passa l'id del paziente: la mappa oggi non sa ancora centrarcisi. */
  onVaiAllaMappa: (pazienteId: string) => void;
};

const moduliSchermate = import.meta.glob('./schermate/*.tsx');

function schermataMancante(nome: string) {
  return function Mancante() {
    return (
      <Avviso
        titolo={`Schermata «${nome}» non ancora disponibile`}
        testo="Questa parte dell'app è in costruzione. Il resto funziona."
      />
    );
  };
}

function caricaSchermata<P>(nome: string): ComponentType<P> {
  const modulo = moduliSchermate[`./schermate/${nome}.tsx`];
  if (!modulo) return schermataMancante(nome) as unknown as ComponentType<P>;
  return lazy(modulo as () => Promise<{ default: ComponentType<P> }>);
}

const Lista = caricaSchermata<PropsLista>('Lista');
const Mappa = caricaSchermata<PropsMappa>('Mappa');
const Scheda = caricaSchermata<PropsScheda>('Scheda');

// ---------------------------------------------------------------- utilità

const perNome = (a: Professionista, b: Professionista) =>
  nomeCompleto(a).localeCompare(nomeCompleto(b), 'it');

type Fase = 'avvio' | 'pronto' | 'errore';

// ---------------------------------------------------------------- guscio

export default function App() {
  const [fase, setFase] = useState<Fase>('avvio');
  const [errore, setErrore] = useState<string | null>(null);

  const [oggi, setOggi] = useState('');
  const [equipe, setEquipe] = useState<Equipe[]>([]);
  const [professionisti, setProfessionisti] = useState<Professionista[]>([]);

  const [filtri, setFiltri] = useState<Filtri | null>(null);
  const [acsId, setAcsId] = useState<string | null>(null);
  const [schermata, setSchermata] = useState<Schermata>('lista');
  const [pazienteId, setPazienteId] = useState<string | null>(null);

  const [selettoreAperto, setSelettoreAperto] = useState(false);
  const [inRete, setInRete] = useState(() => navigator.onLine);

  // ------------------------------------------------------------ rete on/off
  useEffect(() => {
    const su = () => setInRete(true);
    const giu = () => setInRete(false);
    window.addEventListener('online', su);
    window.addEventListener('offline', giu);
    return () => {
      window.removeEventListener('online', su);
      window.removeEventListener('offline', giu);
    };
  }, []);

  // ------------------------------------------------------------ avvio
  const carica = useCallback(async () => {
    setFase('avvio');
    setErrore(null);
    try {
      const [o, eq, pr] = await Promise.all([
        leggiOggi(), leggiEquipe(), leggiProfessionisti(),
      ]);
      if (pr.length === 0) throw new Error('Nessun professionista in archivio');

      setOggi(o);
      setEquipe(eq);
      setProfessionisti(pr);

      // Da dove viene lo stato iniziale, in ordine di precedenza:
      //   1. l'URL (link incollato da un collega, o ricaricamento della pagina);
      //   2. i filtri dell'ultima sessione;
      //   3. il primo ACS in ordine alfabetico.
      const daUrl = statoDaUrl(window.location.search);
      const filtriIniziali = daUrl.filtri ?? filtriRicordati();
      const ordinati = [...pr].sort(perNome);

      const equipeValide = new Set(eq.map((x) => x.equipe_id));
      let equipeId = filtriIniziali?.equipe_id;
      if (!equipeId || !equipeValide.has(equipeId)) equipeId = ordinati[0].equipe_id;

      // L'ACS deve essere coerente con l'équipe: se il link viene da un collega
      // di un'altra équipe, vince l'équipe e si prende il suo primo ACS.
      const candidato = daUrl.acsId ?? acsRicordato();
      const acs =
        ordinati.find((p) => p.professionista_id === candidato && p.equipe_id === equipeId)
        ?? ordinati.find((p) => p.equipe_id === equipeId)
        ?? ordinati[0];

      const f: Filtri = { ...(filtriIniziali ?? {}), equipe_id: acs.equipe_id };

      setFiltri(f);
      setAcsId(acs.professionista_id);
      setSchermata(daUrl.schermata);
      setPazienteId(daUrl.pazienteId);
      ricordaFiltri(f);
      ricordaAcs(acs.professionista_id);

      window.history.replaceState(
        null, '',
        `?${urlDaStato({
          filtri: f,
          schermata: daUrl.schermata,
          pazienteId: daUrl.pazienteId,
          acsId: acs.professionista_id,
        })}`,
      );
      setFase('pronto');
    } catch (e) {
      setErrore(e instanceof Error ? e.message : String(e));
      setFase('errore');
    }
  }, []);

  useEffect(() => { void carica(); }, [carica]);

  // Appena la rete torna, se l'avvio era fallito si riprova da soli: l'ACS non
  // deve accorgersi di dover toccare "Riprova" mentre cammina.
  const faseRef = useRef(fase);
  useEffect(() => { faseRef.current = fase; }, [fase]);
  const eraSenzaRete = useRef(!navigator.onLine);
  useEffect(() => {
    if (!inRete) { eraSenzaRete.current = true; return; }
    if (eraSenzaRete.current && faseRef.current === 'errore') void carica();
    eraSenzaRete.current = false;
  }, [inRete, carica]);

  // ------------------------------------------------------------ navigazione
  // Una sola funzione scrive nell'URL: lo stato dell'app e la barra degli
  // indirizzi non possono divergere.
  const naviga = useCallback((
    prossimo: {
      filtri: Filtri; schermata: Schermata;
      pazienteId: string | null; acsId: string | null;
    },
    modo: 'push' | 'replace' = 'push',
  ) => {
    const query = `?${urlDaStato(prossimo)}`;
    if (modo === 'push') window.history.pushState(null, '', query);
    else window.history.replaceState(null, '', query);
    setFiltri(prossimo.filtri);
    setSchermata(prossimo.schermata);
    setPazienteId(prossimo.pazienteId);
    setAcsId(prossimo.acsId);
  }, []);

  // Tasto Indietro di Android: si rilegge l'URL, unica fonte di verità.
  useEffect(() => {
    const alPop = () => {
      const s = statoDaUrl(window.location.search);
      if (s.filtri) setFiltri(s.filtri);
      setSchermata(s.schermata);
      setPazienteId(s.pazienteId);
      if (s.acsId) setAcsId(s.acsId);
    };
    window.addEventListener('popstate', alPop);
    return () => window.removeEventListener('popstate', alPop);
  }, []);

  const cambiaFiltri = useCallback((f: Filtri) => {
    ricordaFiltri(f);
    // Cambiare filtri non impila cronologia: altrimenti tornare indietro dalla
    // mappa vorrebbe dire ripercorrere venti tocchi di chip.
    naviga({ filtri: f, schermata, pazienteId, acsId }, 'replace');
  }, [naviga, schermata, pazienteId, acsId]);

  const vaiA = useCallback((s: Schermata, id: string | null = null) => {
    if (!filtri) return;
    naviga({ filtri, schermata: s, pazienteId: id, acsId });
  }, [filtri, naviga, acsId]);

  const scegliAcs = useCallback((p: Professionista) => {
    if (!filtri) return;
    // I pazienti di un ACS sono quelli della sua équipe: gli altri filtri
    // restano com'erano, cambia solo il territorio.
    const f: Filtri = { ...filtri, equipe_id: p.equipe_id };
    ricordaFiltri(f);
    ricordaAcs(p.professionista_id);
    setSelettoreAperto(false);
    // Cambiare persona chiude la scheda: quel paziente non è più suo.
    naviga({
      filtri: f,
      schermata: schermata === 'scheda' ? 'lista' : schermata,
      pazienteId: null,
      acsId: p.professionista_id,
    }, 'replace');
  }, [filtri, naviga, schermata]);

  // ------------------------------------------------------------ derivati
  const equipePerId = useMemo(
    () => new Map(equipe.map((e) => [e.equipe_id, e])), [equipe],
  );
  const acs = useMemo(
    () => professionisti.find((p) => p.professionista_id === acsId) ?? null,
    [professionisti, acsId],
  );
  const equipeCorrente = filtri ? equipePerId.get(filtri.equipe_id) ?? null : null;

  // ------------------------------------------------------------ stati globali
  if (fase !== 'pronto' || !filtri) {
    return (
      <div className="flex h-full flex-col bg-carta">
        <Intestazione acs={null} equipe={null} onApriSelettore={() => {}} inCaricamento />
        {fase === 'errore'
          ? <ErroreGlobale inRete={inRete} messaggio={errore} onRiprova={() => void carica()} />
          : <ScheletroLista messaggio="Carico l'elenco degli ACS…" />}
      </div>
    );
  }

  // La scheda paziente occupa tutto lo schermo: ha il suo pulsante di ritorno
  // e non serve il selettore ACS mentre si guarda una persona.
  if (schermata === 'scheda' && pazienteId) {
    return (
      <div className="flex h-full flex-col overflow-x-hidden bg-carta">
        {!inRete && <StrisciaSenzaRete />}
        <main className="min-h-0 flex-1 overflow-y-auto">
          <Suspense fallback={<ScheletroLista messaggio="Apro la scheda…" />}>
            <Scheda
              pazienteId={pazienteId}
              oggi={oggi}
              onChiudi={() => vaiA('lista')}
              onVaiAllaMappa={() => vaiA('mappa')}
            />
          </Suspense>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-x-hidden bg-carta">
      <Intestazione
        acs={acs}
        equipe={equipeCorrente}
        onApriSelettore={() => setSelettoreAperto(true)}
      />
      {!inRete && <StrisciaSenzaRete />}

      {/* La lista scorre dentro <main> (così i suoi filtri restano appiccicati
          sotto l'intestazione); la mappa occupa l'altezza e non scorre. */}
      <main className={`min-h-0 flex-1 ${schermata === 'mappa' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        <Suspense fallback={<ScheletroLista messaggio="Carico i pazienti…" />}>
          {schermata === 'mappa' ? (
            <Mappa
              filtri={filtri}
              oggi={oggi}
              onFiltri={cambiaFiltri}
              onApriPaziente={(id) => vaiA('scheda', id)}
              onVaiAllaLista={() => vaiA('lista')}
            />
          ) : (
            <Lista
              filtri={filtri}
              oggi={oggi}
              onFiltri={cambiaFiltri}
              onApriPaziente={(id) => vaiA('scheda', id)}
              onVaiAllaMappa={() => vaiA('mappa')}
            />
          )}
        </Suspense>
      </main>

      <SelettoreACS
        aperto={selettoreAperto}
        professionisti={professionisti}
        equipePerId={equipePerId}
        scelto={acs}
        onScegli={scegliAcs}
        onChiudi={() => setSelettoreAperto(false)}
      />
    </div>
  );
}

// ---------------------------------------------------------------- pezzi del guscio

function StrisciaSenzaRete() {
  return (
    <div
      role="status"
      className="flex min-h-9 shrink-0 items-center gap-2 border-b border-nebbia
                 bg-terra-tenue px-4 py-2 text-[13px] text-inchiostro"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
        <path d="M12 18h.01M4 9a13 13 0 0116 0M7.5 12.5a8 8 0 019 0M3 3l18 18"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
      <span>Sei senza rete: i dati a schermo potrebbero non essere aggiornati.</span>
    </div>
  );
}

function ScheletroLista({ messaggio }: { messaggio: string }) {
  return (
    <div className="px-4 py-3">
      <p aria-live="polite" className="mb-3 text-[13px] text-grafite">{messaggio}</p>
      <div className="skeleton mb-4 h-10 w-full" aria-hidden="true" />
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="mb-2.5 rounded-scheda border border-nebbia bg-scheda p-3.5"
             aria-hidden="true">
          <div className="skeleton mb-2 h-4 w-3/5" />
          <div className="skeleton h-3 w-4/5" />
        </div>
      ))}
    </div>
  );
}

function Avviso({ titolo, testo, azione }: {
  titolo: string; testo: string; azione?: { etichetta: string; onClick: () => void };
}) {
  return (
    <div role="alert"
         className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
      <h2 className="text-[18px] font-semibold text-inchiostro">{titolo}</h2>
      <p className="mt-2 max-w-[300px] text-[15px] leading-snug text-grafite">{testo}</p>
      {azione && (
        <button
          type="button"
          onClick={azione.onClick}
          className="mt-6 min-h-tocco rounded-xl bg-blu px-6 text-[16px] font-medium
                     text-carta active:opacity-80"
        >
          {azione.etichetta}
        </button>
      )}
    </div>
  );
}

/**
 * L'app si apre sempre, anche senza rete: qui si dice a voce alta che i
 * pazienti non arrivano e come riprovare. Mai uno schermo bianco, mai un
 * messaggio di libreria da solo.
 */
function ErroreGlobale({ inRete, messaggio, onRiprova }: {
  inRete: boolean; messaggio: string | null; onRiprova: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <Avviso
        titolo={inRete ? 'Non riesco a caricare i pazienti' : 'Sei senza rete'}
        testo={inRete
          ? "L'archivio non risponde. L'app è aperta, ma l'elenco arriva dal server: senza risposta non posso mostrarlo."
          : 'Visitare si apre anche senza rete, ma i pazienti arrivano dal server. Torna in copertura e riprova: riparte da sola.'}
        azione={{ etichetta: 'Riprova', onClick: onRiprova }}
      />
      {messaggio && (
        <p className="px-6 pb-8 text-center text-[12px] break-words text-pietra">
          Dettaglio tecnico: {messaggio}
        </p>
      )}
    </div>
  );
}
