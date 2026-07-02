import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
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
