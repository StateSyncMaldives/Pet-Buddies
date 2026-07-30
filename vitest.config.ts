import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    // Tests render at phone width by default (the reference experience);
    // desktop-mode tests widen the viewport explicitly via tests/helpers/viewport.
    environmentOptions: {
      happyDOM: { width: 390, height: 844 },
    },
    globals: true,
    // Repairs `window.localStorage` on Node >=25, where the built-in Web
    // Storage global shadows happy-dom's. See tests/setup/web-storage.ts.
    setupFiles: ['tests/setup/web-storage.ts'],
    // Vitest's 5s default is too tight for this suite. Most server tests spin
    // up a Miniflare D1 and apply every migration to it, and the auth tests
    // also hash passwords with scrypt, which Better Auth makes deliberately
    // slow. That comfortably fits locally and intermittently blew the 5s
    // budget on CI's slower runners — a timeout there also disposes Miniflare
    // mid-flight, producing confusing "poisoned stub" errors that look like a
    // real fault rather than the timeout they actually are.
    //
    // A floor here rather than per-test timeouts: the previous convention was
    // to pass one at each call site, which is easy to forget on a new test and
    // fails only on CI. Individual `it(…, 15_000)` values still win where they
    // are already set.
    testTimeout: 30_000,
    // afterEach hooks dispose Miniflare instances; give them the same room.
    hookTimeout: 30_000,
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
  },
})
