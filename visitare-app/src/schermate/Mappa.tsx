// Schermata 2 — Mappa.
//
// Stessi filtri della lista, stesso oggetto `Filtri`, stessa BarraFiltri in cima.
// La mappa NON si pagina: chiede al server l'insieme filtrato completo in
// proiezione leggera (leggiMappa gestisce già i blocchi da 1.000).
//
// Regole tenute a mente qui dentro:
//  - 390 px, una mano sola: comandi in basso a destra, niente barre orizzontali.
//  - Colore = quota, forma = stato. Mai il colore da solo.
//  - Inquadratura calcolata sui punti reali, mai un raggio fisso.
//  - Nessuna animazione costosa: le transizioni di camera durano 0 o 250 ms.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Map as MappaGL, Marker } from 'maplibre-gl';
import type { GeoJSONSource } from 'maplibre-gl';
import type { FeatureCollection, Point } from 'geojson';
import 'maplibre-gl/dist/maplibre-gl.css';

import BarraFiltri from '../componenti/BarraFiltri';
import NastroSchede from '../componenti/NastroSchede';
import { leggiContatori, leggiEquipe, leggiMappa } from '../dati/api';
import type { Contatori, Equipe, Filtri, PazienteMappa } from '../dati/contratto';
import { STILE_OSM } from '../mappa/stile';
import {
  collezionePunti, coloreQuota, distanzaApprossimata, espressioneColoreQuota,
  espressioneIconaRombo, QUOTA_MAX, registraIconeRombo, riquadro, tavolozza,
} from '../mappa/pin';

type Props = {
  filtri: Filtri;
  oggi: string;
  onFiltri: (f: Filtri) => void;
  onApriPaziente: (id: string) => void;
  onVaiAllaLista: () => void;
};

/** Quanti vicini entrano nel nastro quando si tocca un pin. */
const VICINI = 20;

type SpecSorgente = Parameters<MappaGL['addSource']>[1];
type SpecStrato = Parameters<MappaGL['addLayer']>[0];

export default function Mappa({
  filtri, oggi, onFiltri, onApriPaziente, onVaiAllaLista,
}: Props) {
  const contenitore = useRef<HTMLDivElement | null>(null);
  const mappa = useRef<MappaGL | null>(null);
  const segnaSede = useRef<Marker | null>(null);
  const segniGruppo = useRef<Map<number, Marker>>(new Map());

  const [pronta, setPronta] = useState(false);
  const [pazienti, setPazienti] = useState<PazienteMappa[]>([]);
  const [contatori, setContatori] = useState<Contatori | null>(null);
  const [equipe, setEquipe] = useState<Equipe[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [selezionato, setSelezionato] = useState<string | null>(null);
  const [vicini, setVicini] = useState<PazienteMappa[]>([]);
  const [tentativo, setTentativo] = useState(0);

  // I gestori degli eventi MapLibre vivono fuori da React: leggono da qui.
  const pazientiRef = useRef<PazienteMappa[]>([]);
  pazientiRef.current = pazienti;

  const sede = useMemo(
    () => equipe.find((e) => e.equipe_id === filtri.equipe_id) ?? null,
    [equipe, filtri.equipe_id],
  );

  // --------------------------------------------------------------- selezione
  /** Un pin toccato: seleziona lui e mette nel nastro i suoi vicini più prossimi. */
  const selezionaConVicini = useCallback((paziente_id: string) => {
    const tutti = pazientiRef.current;
    const scelto = tutti.find((p) => p.paziente_id === paziente_id);
    if (!scelto) return;
    const ordinati = tutti
      .map((p) => ({ p, d: distanzaApprossimata(scelto, p) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, VICINI)
      .map((x) => x.p);
    setVicini(ordinati);
    setSelezionato(paziente_id);
  }, []);

  const chiudiNastro = useCallback(() => {
    setVicini([]);
    setSelezionato(null);
  }, []);

  // ------------------------------------------------------------------ équipe
  useEffect(() => {
    let vivo = true;
    leggiEquipe()
      .then((e) => { if (vivo) setEquipe(e); })
      .catch(() => { /* la sede è un di più: se manca, la mappa funziona lo stesso */ });
    return () => { vivo = false; };
  }, []);

  // -------------------------------------------------------------------- dati
  useEffect(() => {
    let vivo = true;
    setCaricamento(true);
    setErrore(null);
    Promise.all([leggiMappa(filtri), leggiContatori(filtri)])
      .then(([p, c]) => {
        if (!vivo) return;
        setPazienti(p);
        setContatori(c);
        setCaricamento(false);
        setVicini([]);
        setSelezionato(null);
      })
      .catch((e: unknown) => {
        if (!vivo) return;
        setErrore(e instanceof Error ? e.message : 'Errore di rete');
        setCaricamento(false);
      });
    return () => { vivo = false; };
  }, [filtri, tentativo]);

  // ------------------------------------------------------- creazione mappa
  useEffect(() => {
    if (!contenitore.current || mappa.current) return;
    const tav = tavolozza();
    const gruppi = segniGruppo.current;   // la Map è creata una volta sola: stabile

    const m = new MappaGL({
      container: contenitore.current,
      style: STILE_OSM,
      center: [-43.245, -22.99],   // provvisorio: fitBounds arriva coi punti veri
      zoom: 12,
      attributionControl: { compact: false },
      pitchWithRotate: false,
      dragRotate: false,
    });
    mappa.current = m;

    m.on('load', () => {
      registraIconeRombo(m, tav);

      m.addSource('pazienti', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterRadius: 60,
        clusterMaxZoom: 16,
      } as unknown as SpecSorgente);

      // Alone della selezione, sotto ai pin.
      m.addLayer({
        id: 'strato-selezione',
        type: 'circle',
        source: 'pazienti',
        filter: ['==', ['get', 'id'], '—'],
        paint: {
          'circle-radius': 16,
          'circle-color': tav.blu,
          'circle-opacity': 0.18,
          'circle-stroke-width': 3,
          'circle-stroke-color': tav.blu,
        },
      } as unknown as SpecStrato);

      // Pazienti senza PS aperto: CERCHIO, colore per quota.
      m.addLayer({
        id: 'strato-punti',
        type: 'circle',
        source: 'pazienti',
        filter: ['all', ['!', ['has', 'point_count']], ['!', ['get', 'ps']]],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, 4, 17, 8],
          'circle-color': espressioneColoreQuota(tav),
          'circle-stroke-width': 1.5,
          'circle-stroke-color': tav.scheda,
        },
      } as unknown as SpecStrato);

      // PS non ricontattato: ROMBO con contorno urgenza. La forma, non il colore.
      m.addLayer({
        id: 'strato-ps',
        type: 'symbol',
        source: 'pazienti',
        filter: ['all', ['!', ['has', 'point_count']], ['get', 'ps']],
        layout: {
          'icon-image': espressioneIconaRombo(),
          'icon-size': ['interpolate', ['linear'], ['zoom'], 13, 0.5, 17, 0.9],
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        },
      } as unknown as SpecStrato);

      // Tocco con tolleranza: il dito non è un pixel, la finestra è 44 px.
      m.on('click', (e) => {
        const r = 22;
        const trovati = m.queryRenderedFeatures(
          [[e.point.x - r, e.point.y - r], [e.point.x + r, e.point.y + r]],
          { layers: ['strato-punti', 'strato-ps'] },
        );
        if (trovati.length === 0) { chiudiNastro(); return; }
        let vicino = trovati[0];
        let minimo = Infinity;
        for (const f of trovati) {
          const g = f.geometry as Point;
          const pt = m.project([g.coordinates[0], g.coordinates[1]]);
          const d = Math.hypot(pt.x - e.point.x, pt.y - e.point.y);
          if (d < minimo) { minimo = d; vicino = f; }
        }
        const id = vicino.properties?.id as string | undefined;
        if (id) selezionaConVicini(id);
      });

      setPronta(true);
    });

    return () => {
      // I marcatori sono figli della mappa: `remove()` li porta via con sé.
      gruppi.clear();
      m.remove();
      mappa.current = null;
    };
  }, [chiudiNastro, selezionaConVicini]);

  // ------------------------------------- raggruppamenti come marcatori HTML
  // Senza chiave API non esistono font scaricabili, quindi MapLibre non può
  // disegnare i numeri: i cerchi numerati sono DOM, pochi e leggeri.
  useEffect(() => {
    const m = mappa.current;
    if (!m || !pronta) return;
    const tav = tavolozza();

    const aggiorna = () => {
      const sorgente = m.getSource('pazienti') as GeoJSONSource | undefined;
      if (!sorgente) return;
      const gruppi = m.querySourceFeatures('pazienti').filter((f) => f.properties?.point_count);
      const visti = new Set<number>();

      for (const g of gruppi) {
        const id = g.properties!.cluster_id as number;
        if (visti.has(id)) continue;
        visti.add(id);
        const conteggio = g.properties!.point_count as number;
        const coord = (g.geometry as Point).coordinates as [number, number];

        let segno = segniGruppo.current.get(id);
        if (!segno) {
          const el = document.createElement('button');
          el.type = 'button';
          el.setAttribute('aria-label', `Gruppo di ${conteggio} pazienti, ingrandisci`);
          const lato = conteggio < 50 ? 44 : conteggio < 300 ? 52 : 60;
          el.style.cssText = [
            `width:${lato}px`, `height:${lato}px`, 'border-radius:9999px',
            `background:${tav.blu}`, `border:3px solid ${tav.scheda}`,
            'color:#fff', 'font-weight:700', `font-size:${conteggio > 999 ? 13 : 15}px`,
            'display:flex', 'align-items:center', 'justify-content:center',
            'cursor:pointer', 'padding:0',
          ].join(';');
          el.textContent = conteggio > 999 ? `${Math.round(conteggio / 100) / 10}k` : String(conteggio);
          el.addEventListener('click', (ev) => {
            ev.stopPropagation();
            const s = m.getSource('pazienti') as GeoJSONSource | undefined;
            if (!s) return;
            s.getClusterExpansionZoom(id)
              .then((z) => m.easeTo({ center: coord, zoom: z, duration: 250 }))
              .catch(() => { /* gruppo sparito: nessun danno */ });
          });
          segno = new Marker({ element: el }).setLngLat(coord).addTo(m);
          segniGruppo.current.set(id, segno);
        } else {
          segno.setLngLat(coord);
        }
      }

      segniGruppo.current.forEach((s, id) => {
        if (!visti.has(id)) { s.remove(); segniGruppo.current.delete(id); }
      });
    };

    const alDato = (e: { sourceId?: string; isSourceLoaded?: boolean }) => {
      if (e.sourceId === 'pazienti' && e.isSourceLoaded) aggiorna();
    };
    m.on('moveend', aggiorna);
    m.on('sourcedata', alDato);
    // 'idle' è l'unico evento che garantisce tessere caricate E disegnate.
    // Senza, ingrandendo oltre clusterMaxZoom i cerchi numerati restavano a
    // schermo sopra i pin singoli: 'moveend' scatta quando le tessere del nuovo
    // zoom non sono ancora pronte, e 'sourcedata' con isSourceLoaded non
    // ririvava sempre. I relitti non sparivano più.
    m.on('idle', aggiorna);
    aggiorna();
    return () => {
      m.off('moveend', aggiorna);
      m.off('sourcedata', alDato);
      m.off('idle', aggiorna);
    };
  }, [pronta]);

  // ----------------------------------------------- punti + inquadratura vera
  useEffect(() => {
    const m = mappa.current;
    if (!m || !pronta) return;
    const sorgente = m.getSource('pazienti') as GeoJSONSource | undefined;
    if (!sorgente) return;
    sorgente.setData(collezionePunti(pazienti, oggi) as unknown as FeatureCollection);

    const r = riquadro(
      pazienti,
      sede ? { latitudine: sede.sede_latitudine, longitudine: sede.sede_longitudine } : null,
    );
    if (r) {
      m.fitBounds(r, {
        padding: { top: 56, bottom: 220, left: 32, right: 32 },
        duration: 0,           // niente volo: sui telefoni lenti è tempo perso
        maxZoom: 17,
      });
    }
  }, [pazienti, sede, pronta, oggi]);

  // ------------------------------------------------------- sede UBS visibile
  useEffect(() => {
    const m = mappa.current;
    if (!m || !pronta) return;
    segnaSede.current?.remove();
    segnaSede.current = null;
    if (!sede) return;
    const tav = tavolozza();
    const el = document.createElement('div');
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', `Sede ${sede.unita_nome}`);
    el.style.cssText = [
      'width:28px', 'height:28px', 'border-radius:6px',
      `background:${tav.scheda}`, `border:3px solid ${tav.inchiostro}`,
      'display:flex', 'align-items:center', 'justify-content:center',
      `color:${tav.inchiostro}`, 'font-size:11px', 'font-weight:800',
    ].join(';');
    el.textContent = 'UBS';
    segnaSede.current = new Marker({ element: el })
      .setLngLat([sede.sede_longitudine, sede.sede_latitudine])
      .addTo(m);
  }, [sede, pronta]);

  // ------------------------------------------- la mappa segue la selezione
  useEffect(() => {
    const m = mappa.current;
    if (!m || !pronta) return;
    if (m.getLayer('strato-selezione')) {
      m.setFilter('strato-selezione', ['==', ['get', 'id'], selezionato ?? '—']);
    }
    if (!selezionato) return;
    const p = pazientiRef.current.find((x) => x.paziente_id === selezionato);
    if (!p) return;
    m.easeTo({
      center: [p.longitudine, p.latitudine],
      duration: 250,
      offset: [0, -70],   // la scheda occupa la fascia bassa: il pin resta sopra
      zoom: Math.max(m.getZoom(), 16),
    });
  }, [selezionato, pronta]);

  // --------------------------------------------------------------- interfaccia
  const messaggio = caricamento
    ? 'Carico i pazienti sulla mappa…'
    : errore
      ? `Non riesco a leggere i pazienti: ${errore}`
      : `${pazienti.length} pazienti sulla mappa`;

  const tav = tavolozza();

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-carta">
      <div className="shrink-0 border-b border-nebbia bg-carta">
        <BarraFiltri
          filtri={filtri}
          contatori={contatori}
          caricamento={caricamento}
          onCambia={onFiltri}
        />
      </div>

      <div className="relative min-h-0 flex-1">
        {/*
          Posizione in stile inline, non con le classi Tailwind.
          maplibre-gl.css dichiara `.maplibregl-map { position: relative }` con la
          stessa specificità di `.absolute`, e arriva DOPO nel foglio di stile
          (è importato in questo chunk, caricato pigramente): vincerebbe lui.
          Il contenitore tornerebbe `relative` con altezza 0, `overflow:hidden`
          ritaglierebbe il canvas e la mappa sarebbe uno schermo nero — senza
          nessun errore in console.
        */}
        <div ref={contenitore} style={{ position: 'absolute', inset: 0 }} />

        {/* Legenda: il colore da solo non basta mai. */}
        <div className="pointer-events-none absolute top-2 right-2 z-10 rounded-scheda border border-nebbia bg-scheda/95 px-2.5 py-2 text-[12px] text-grafite">
          <p className="font-semibold text-inchiostro">Quota</p>
          <div
            className="my-1 h-2 w-24 rounded-full"
            style={{ background: `linear-gradient(90deg, ${coloreQuota(0, tav)}, ${coloreQuota(QUOTA_MAX, tav)})` }}
          />
          <div className="flex w-24 justify-between"><span>0 m</span><span>{QUOTA_MAX}+ m</span></div>
          <p className="mt-1.5 flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-block h-3 w-3 rotate-45"
              style={{ background: coloreQuota(120, tav), outline: `2px solid ${tav.urgenza}` }}
            />
            PS non ricontattato
          </p>
        </div>

        {/* Attesa oltre 200 ms: mai un'attesa muta. */}
        {caricamento ? (
          <div className="absolute inset-x-0 top-2 z-10 flex justify-center">
            <div className="flex items-center gap-2 rounded-full border border-nebbia bg-scheda px-3 py-2">
              <span aria-hidden="true" className="skeleton h-4 w-4 rounded-full" />
              <span className="text-[14px] text-grafite">Carico i pazienti…</span>
            </div>
          </div>
        ) : null}

        {!caricamento && errore ? (
          <div className="absolute inset-x-4 top-4 z-10 rounded-scheda border border-nebbia bg-scheda p-3">
            <p className="text-[15px] font-semibold text-urgenza">Non riesco a leggere i pazienti</p>
            <p className="mt-1 text-[14px] text-grafite">{errore}</p>
            <button
              type="button"
              onClick={() => setTentativo((n) => n + 1)}
              className="mt-3 h-tocco w-full rounded-scheda bg-blu px-4 text-[16px] font-semibold text-white"
            >
              Riprova
            </button>
          </div>
        ) : null}

        {!caricamento && !errore && pazienti.length === 0 ? (
          <div className="absolute inset-x-4 top-4 z-10 rounded-scheda border border-nebbia bg-scheda p-3">
            <p className="text-[15px] font-semibold text-inchiostro">Nessun paziente con questi filtri</p>
            <p className="mt-1 text-[14px] text-grafite">Togli un filtro per vedere più punti.</p>
          </div>
        ) : null}

        <p aria-live="polite" className="sr-only">{messaggio}</p>

        {/* Comandi e nastro nella stessa colonna: non si sovrappongono mai. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col gap-2 pb-4">
          <div className="flex items-center justify-between px-4">
            {vicini.length > 0 ? (
              <button
                type="button"
                onClick={chiudiNastro}
                aria-label="Chiudi le schede"
                className="pointer-events-auto flex h-tocco w-tocco items-center justify-center rounded-full border border-nebbia bg-scheda text-[22px] leading-none text-grafite"
              >
                <span aria-hidden="true">×</span>
              </button>
            ) : <span />}

            <button
              type="button"
              onClick={onVaiAllaLista}
              className="pointer-events-auto flex h-tocco items-center gap-2 rounded-full bg-blu px-4 text-[15px] font-semibold text-white"
            >
              <span aria-hidden="true">☰</span>
              Lista
            </button>
          </div>

          <NastroSchede
            pazienti={vicini}
            selezionato={selezionato}
            oggi={oggi}
            onSeleziona={setSelezionato}
            onApri={onApriPaziente}
          />
        </div>
      </div>
    </div>
  );
}
