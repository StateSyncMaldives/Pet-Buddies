import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const GENERATOR = readFileSync('scripts/generate-sw.mjs', 'utf8')

/**
 * The service worker's `navigateFallback` answers navigations from the cached
 * SPA shell. Without a denylist it intercepts EVERY navigation — including
 * server routes — and that silently broke Google sign-in in production: the
 * browser navigated to /api/auth/callback/google, the service worker returned
 * the shell, the request never reached the Worker, and the user was stranded
 * on a blank page with the OAuth code unredeemed.
 *
 * It could not reproduce locally, because the service worker is registered
 * only under `import.meta.env.PROD`. These assertions are on the generator
 * config, so the guarantee holds without needing a production build.
 */
describe('service worker navigation fallback', () => {
  it('falls back to the SPA shell for app navigations', () => {
    expect(GENERATOR).toMatch(/navigateFallback:\s*'\/_shell\.html'/)
  })

  it('excludes server routes from the fallback', () => {
    expect(GENERATOR).toMatch(/navigateFallbackDenylist/)

    // /api/ covers the Better Auth handler: callback, error and session.
    expect(GENERATOR).toMatch(/\/\^\\\/api\\\/\//)
    // Server functions and Worker-streamed media must reach the network too.
    expect(GENERATOR).toMatch(/_serverFn/)
    expect(GENERATOR).toMatch(/media/)
  })

  it('keeps the OAuth callback path out of the cached-shell fallback', () => {
    const denylist = GENERATOR.match(/navigateFallbackDenylist:\s*\[([\s\S]*?)\]/)?.[1]
    expect(denylist).toBeDefined()

    // Regex literals whose source contains escaped slashes, e.g. /^\/api\//
    const patterns = [...denylist!.matchAll(/\/((?:\\.|[^/\\])+)\//g)].map(
      (match) => new RegExp(match[1]!),
    )
    expect(patterns.length).toBeGreaterThan(0)

    // The exact path Google redirects back to.
    expect(patterns.some((pattern) => pattern.test('/api/auth/callback/google'))).toBe(true)
    // A normal app route must still be served the shell offline.
    expect(patterns.some((pattern) => pattern.test('/browse'))).toBe(false)
  })
})
