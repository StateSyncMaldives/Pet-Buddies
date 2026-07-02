import { describe, expect, it } from 'vitest'

import { createAppRuntime, createDemoSession } from '../../../../src/server/runtime/app-session'

describe('app session runtime boundary', () => {
  it('creates a demo session carrying the viewer id, mock user, and moderator id', () => {
    const session = createDemoSession()

    expect(session.viewerId).toBeTruthy()
    expect(session.mockUser.name).toBe(session.viewerId)
    expect(session.mockUser.email).toContain('@')
    expect(session.moderatorId).toBeTruthy()
  })

  it('creates a working app runtime that hydrates seeded listings and clinics for the session viewer', () => {
    const { backend, session } = createAppRuntime()

    const hydrated = backend.hydrateAppShell({ viewerId: session.viewerId })

    expect(hydrated.listings.length).toBeGreaterThan(0)
    expect(hydrated.clinics.length).toBeGreaterThan(0)
  })

  it('creates an independent backend instance per runtime call', () => {
    const first = createAppRuntime()
    const second = createAppRuntime()

    first.backend.toggleSavedListing({ listingId: 'mishka', viewerId: first.session.viewerId })

    const hydratedSecond = second.backend.hydrateAppShell({ viewerId: second.session.viewerId })
    expect(hydratedSecond.listings.find((listing) => listing.id === 'mishka')?.savedByViewer).toBe(false)
  })
})
