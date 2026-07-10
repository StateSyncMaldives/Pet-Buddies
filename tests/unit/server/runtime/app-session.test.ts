import { describe, expect, it } from 'vitest'

import { createAppRuntime, createDemoSession } from '../../../../src/server/runtime/app-session'

describe('app session runtime boundary', () => {
  it('creates a demo session carrying the viewer id, mock user, and moderator id', () => {
    const session = createDemoSession()

    // viewerId is the stable seeded users.id; the display name is separate.
    expect(session.viewerId).toBeTruthy()
    expect(session.mockUser.name).toBeTruthy()
    expect(session.mockUser.name).not.toBe(session.viewerId)
    expect(session.mockUser.email).toContain('@')
    expect(session.moderatorId).toBeTruthy()
  })

  it('creates a working app runtime that hydrates seeded listings and clinics for the session viewer', async () => {
    const { backend, session } = createAppRuntime()

    const hydrated = await backend.hydrateAppShell({ viewerId: session.viewerId })

    expect(hydrated.listings.length).toBeGreaterThan(0)
    expect(hydrated.clinics.length).toBeGreaterThan(0)
  })

  it('creates an independent backend instance per runtime call', async () => {
    const first = createAppRuntime()
    const second = createAppRuntime()

    await first.backend.toggleSavedListing({ listingId: 'mishka', viewerId: first.session.viewerId })

    const hydratedSecond = await second.backend.hydrateAppShell({ viewerId: second.session.viewerId })
    expect(hydratedSecond.listings.find((listing) => listing.id === 'mishka')?.savedByViewer).toBe(false)
  })
})
