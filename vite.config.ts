import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tanstackStart({
      router: {
        entry: 'router/index.tsx',
        routesDirectory: 'routes',
        generatedRouteTree: 'routeTree.gen.ts',
      },
      spa: {
        enabled: true,
        maskPath: '/',
      },
    }),
    react(),
  ],
})
