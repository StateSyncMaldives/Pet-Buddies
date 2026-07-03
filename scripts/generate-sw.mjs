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
  mode: 'production',
})

for (const warning of warnings) {
  console.warn(warning)
}

console.log(`Generated dist/client/sw.js with ${count} precached files (${size} bytes).`)
