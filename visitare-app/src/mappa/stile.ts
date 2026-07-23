// Stile cartografico — raster OpenStreetMap, senza chiave API.
//
// Nessun servizio a chiave (niente Mapbox, niente MapTiler): il ripiego
// dichiarato nel piano è il raster OSM pubblico. L'attribuzione
// "© OpenStreetMap" è obbligatoria e resta visibile in basso a sinistra.
//
// Nota: lo stile NON dichiara `glyphs`. Non c'è nessun font scaricabile senza
// chiave, quindi in mappa non si disegna mai testo con MapLibre: i numeri dei
// raggruppamenti sono marcatori HTML (vedi Mappa.tsx).

import type { MapOptions } from 'maplibre-gl';

export const ATTRIBUZIONE = '© OpenStreetMap';

/** Stile minimo: una sola sorgente raster e un solo strato di fondo. */
export const STILE_OSM = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: ATTRIBUZIONE,
    },
  },
  layers: [
    { id: 'fondo-osm', type: 'raster', source: 'osm' },
  ],
} as unknown as MapOptions['style'];
