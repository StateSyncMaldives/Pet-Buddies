import { webcrypto } from 'node:crypto'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// `serialize-javascript` (pulled in via workbox-build/@rollup/plugin-terser)
// reads the bare global `crypto` identifier during the production build.
// Node 18 in this environment does not expose that identifier inside the CJS
// modules used by Workbox, so assign it explicitly for build-time consumers.
globalThis.crypto = webcrypto as Crypto

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Workbox's production bundling path pulls in @rollup/plugin-terser,
      // which currently fails in this Node 18 environment via
      // serialize-javascript's bare `crypto` lookup. Keep the generated service
      // worker functional by using the non-minified Workbox mode instead.
      workbox: {
        mode: 'development',
        disableDevLogs: true,
      },
      includeAssets: ['favicon.svg', 'icon.svg'],
      manifest: {
        name: 'Pet Buddies MV',
        short_name: 'Pet Buddies',
        description:
          'Adopt cats & birds, report strays, and find a vet — made for Greater Malé.',
        id: '/',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F7F8FA',
        theme_color: '#F7F8FA',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      // Keep the dev server free of service-worker caching while we build the UI.
      devOptions: { enabled: false },
    }),
  ],
})
