import { describe, expect, it } from 'vitest'

import { createPrototypeBackend } from '../../../../src/server/runtime/prototype-backend'

describe('prototype backend runtime', () => {
  it('hydrates the app shell with seeded listings and clinics', () => {
    const backend = createPrototypeBackend()

    const result = backend.hydrateAppShell({ viewerId: 'viewer-1' })

    expect(result.listings).toHaveLength(9)
    expect(result.clinics.map((clinic) => clinic.name)).toEqual(['Oases Vet Hospital', 'Erika Vet Hospital'])
    expect(result.listings.find((listing) => listing.id === 'pending-simba')?.status).toBe('pending')
  })

  it('persists save toggles in subsequent hydrations for the same viewer', () => {
    const backend = createPrototypeBackend()

    expect(backend.toggleSavedListing({ listingId: 'mishka', viewerId: 'viewer-1' })).toEqual({
      ok: true,
      data: {
        listingId: 'mishka',
        saved: true,
      },
    })

    const hydrated = backend.hydrateAppShell({ viewerId: 'viewer-1' })
    expect(hydrated.listings.find((listing) => listing.id === 'mishka')?.savedByViewer).toBe(true)
  })

  it('creates pending listings through the typed create-listing use case', () => {
    const backend = createPrototypeBackend()

    const created = backend.createListing({
      actorUserId: 'Aishath Ali',
      request: {
        species: 'bird',
        birdSpecies: 'Cockatiel',
        name: 'Sunny',
        ageText: '10 months',
        sex: 'unknown',
        areaLabel: 'Hulhumalé',
        story: 'Friendly bird ready for a new home.',
        tagIds: [backend.getTagId('Hand-tame')],
        imageObjectKeys: [],
      },
    })

    expect(created.ok).toBe(true)
    if (created.ok) {
      expect(created.data.listing.status).toBe('pending')
      expect(created.data.listing.listedBy.displayName).toBe('Aishath Ali')
    }
  })

  it('routes lost/found reports to the correct partner organisation', () => {
    const backend = createPrototypeBackend()

    const result = backend.createReport({
      request: {
        reportKind: 'found',
        species: 'bird',
        birdSpecies: 'Budgerigar',
        areaLabel: 'Maafannu, Malé',
        description: 'Found a tame budgie near the harbour.',
      },
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.report.routedToOrganizationId).toBe('org-bird-rescue')
      expect(backend.getOrganizationName(result.data.report.routedToOrganizationId)).toBe('Zoophilist Society Maldives')
    }
  })

  it('applies moderation transitions and exposes the updated detail shape', () => {
    const backend = createPrototypeBackend()

    const result = backend.moderateListing({
      listingId: 'pending-simba',
      actorUserId: 'moderator-1',
      request: { action: 'approved' },
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.listing.status).toBe('live')
      expect(result.data.moderationEventId).toMatch(/^mod-event-/)
    }
  })
})
