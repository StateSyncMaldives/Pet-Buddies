import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { generateSW } from 'workbox-build'

const clientOutDir = join(process.cwd(), 'dist', 'client')

if (!existsSync(clientOutDir)) {
  throw new Error(`Cannot generate service worker: ${clientOutDir} does not exist`)
}

const { count, size, warnings } = await generateSW({
  globDirectory: clientOutDir,
  globPatterns: ['**/*.{css,html,js,json,svg,webmanifest}'],
  globIgnores: ['sw.js', 'workbox-*.js'],
  swDest: join(clientOutDir, 'sw.js'),
  clientsClaim: true,
  skipWaiting: true,
  cleanupOutdatedCaches: true,
  navigateFallback: '/_shell.html',
  // Server routes must never be answered from the cache. `navigateFallback`
  // otherwise intercepts EVERY navigation and returns the SPA shell — which
  // silently broke Google sign-in: the browser navigates to
  // /api/auth/callback/google, the service worker serves the shell instead,
  // the request never reaches the Worker, and the user is left on a blank page
  // at the callback URL with the OAuth code unredeemed.
  //
  // It only reproduced on a deployed origin, because the service worker is
  // registered under `import.meta.env.PROD` and so never runs on localhost.
  navigateFallbackDenylist: [
    /^\/api\//, // Better Auth (callback, error, session) and any future API route
    /^\/_serverFn\//, // TanStack Start server functions
    /^\/media\//, // R2-backed media streamed by the Worker
  ],
  mode: 'production',
})

for (const warning of warnings) {
  console.warn(warning)
}

console.log(`Generated dist/client/sw.js with ${count} precached files (${size} bytes).`)
