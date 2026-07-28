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
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
  },
})
