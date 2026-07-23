import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// PWA — l'ACS non digita un indirizzo ogni mattina: l'icona sta sulla schermata
// Home e l'app parte a schermo intero.
//
// Il service worker mette in cache SOLO IL GUSCIO (HTML, JS, CSS, icone).
// I dati dei pazienti arrivano sempre dalla rete, per decisione di prodotto:
// nessuna regola di runtime caching punta a Supabase, e non deve comparirne una
// per sbaglio. Senza rete l'app si apre e lo dice; non finge di sapere.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [
        'favicon.svg',
        'favicon-32.png',
        'visitare-pin.svg',
        'visitare-badge-180.png',
      ],
      manifest: {
        name: 'Visitare — chi visitare oggi',
        short_name: 'Visitare',
        description: "L'app degli Agenti Comunitari di Salute: chi visitare oggi, per filtro e per quota.",
        lang: 'it',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F7F5F1', // token: carta
        theme_color: '#F7F5F1',      // la barra di sistema sparisce nel fondo
        categories: ['medical', 'health', 'productivity'],
        icons: [
          { src: '/visitare-badge-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/visitare-badge-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/visitare-badge-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Solo il guscio. Nessun dato.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,woff2}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // Le immagini grandi del marchio non valgono la banda del primo avvio:
        // servono a chi apre un link, non a chi lavora per strada.
        globIgnores: ['**/visitare-og.png', '**/visitare-badge-1024.png'],
      },
      devOptions: { enabled: false },
    }),
  ],
})
