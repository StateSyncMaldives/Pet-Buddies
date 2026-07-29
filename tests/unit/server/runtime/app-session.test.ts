import { describe, expect, it } from 'vitest'

import { ANONYMOUS } from '../../../../src/server/auth/resolve-viewer'
import { createAppRuntime } from '../../../../src/server/runtime/app-session'
import { TEST_VIEWER } from '../../../helpers/viewers'

describe('app session runtime boundary', () => {
  it('defaults to an anonymous viewer', () => {
    expect(createAppRuntime().viewer).toEqual(ANONYMOUS)
  })

  it('refuses viewer-owned writes for an anonymous runtime', async () => {
    const { mutations } = createAppRuntime()

    await expect(mutations.toggleSavedListing({ listingId: 'mishka' })).rejects.toThrow(
      /signed-in viewer is required/i,
    )
  })

  it('carries the supplied viewer and hydrates seeded listings and clinics for it', async () => {
    const { backend, viewer } = createAppRuntime(TEST_VIEWER)

    expect(viewer).toEqual(TEST_VIEWER)
    const hydrated = await backend.hydrateAppShell({ viewerId: TEST_VIEWER.id })

    expect(hydrated.listings.length).toBeGreaterThan(0)
    expect(hydrated.clinics.length).toBeGreaterThan(0)
  })

  it('creates an independent backend instance per runtime call', async () => {
    const first = createAppRuntime(TEST_VIEWER)
    const second = createAppRuntime(TEST_VIEWER)

    await first.backend.toggleSavedListing({ listingId: 'mishka', viewerId: TEST_VIEWER.id })

    const hydratedSecond = await second.backend.hydrateAppShell({ viewerId: TEST_VIEWER.id })
    expect(hydratedSecond.listings.find((listing) => listing.id === 'mishka')?.savedByViewer).toBe(false)
  })
})
