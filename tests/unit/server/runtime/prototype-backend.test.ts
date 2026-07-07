import { describe, expect, it } from 'vitest'

import { createPrototypeBackend } from '../../../../src/server/runtime/prototype-backend'
import { JPEG_BYTES } from '../../../helpers/media-fixtures'

describe('prototype backend runtime', () => {
  it('uploads media through the runtime and serves it back by object key', async () => {
    const backend = createPrototypeBackend({ generateId: (prefix) => `${prefix}-1` })

    const result = await backend.uploadMedia({
      kind: 'listing-image',
      contentType: 'image/jpeg',
      sizeBytes: JPEG_BYTES.byteLength,
      bytes: JPEG_BYTES,
    })

    expect(result).toEqual({
      ok: true,
      data: {
        objectKey: 'listing-images/media-1.jpg',
        url: '/media/listing-images/media-1.jpg',
      },
    })

    const stored = backend.getMediaObject('listing-images/media-1.jpg')
    expect(stored?.contentType).toBe('image/jpeg')
    expect(stored ? Array.from(stored.bytes) : null).toEqual(Array.from(JPEG_BYTES))
    expect(backend.getMediaObject('listing-images/missing.jpg')).toBe(null)
  })

  it('rejects an invalid media upload and stores nothing', async () => {
    const backend = createPrototypeBackend({ generateId: (prefix) => `${prefix}-1` })

    const result = await backend.uploadMedia({
      kind: 'report-photo',
      contentType: 'image/png',
      sizeBytes: JPEG_BYTES.byteLength,
      bytes: JPEG_BYTES,
    })

    expect(result.ok).toBe(false)
    expect(backend.getMediaObject('report-photos/media-1.png')).toBe(null)
  })

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

  it('loads clinic data through the explicit clinic read model', () => {
    const backend = createPrototypeBackend()

    const result = backend.listClinics()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.items.map((clinic) => clinic.name)).toEqual(['Oases Vet Hospital', 'Erika Vet Hospital'])
    }
  })

  it('loads saved listings through the explicit saved listing read model', () => {
    const backend = createPrototypeBackend()

    backend.toggleSavedListing({ listingId: 'mishka', viewerId: 'viewer-1' })

    const firstViewer = backend.listSavedListings({ viewerId: 'viewer-1' })
    const secondViewer = backend.listSavedListings({ viewerId: 'viewer-2' })

    expect(firstViewer.ok).toBe(true)
    expect(secondViewer.ok).toBe(true)
    if (firstViewer.ok && secondViewer.ok) {
      expect(firstViewer.data.items.map((listing) => listing.slug)).toEqual(['mishka'])
      expect(firstViewer.data.items[0].savedByViewer).toBe(true)
      expect(secondViewer.data.items).toEqual([])
    }
  })

  it('loads sent adoption inquiries through the explicit you read model', () => {
    const backend = createPrototypeBackend({
      now: () => '2099-01-01T00:00:00.000Z',
      generateId: (prefix) => `${prefix}-fake-1`,
    })

    backend.createInquiry({
      viewerId: 'viewer-1',
      request: {
        listingId: 'mishka',
        message: 'Could we visit Mishka this week?',
      },
    })

    const result = backend.getYouReadModel({ viewerId: 'viewer-1' })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.sentAdoptionInquiries).toEqual([
        {
          id: 'inquiry-fake-1',
          listingId: 'mishka',
          listingName: 'Mishka',
          recipientDisplayName: 'Maldives Cat Rescue',
          message: 'Could we visit Mishka this week?',
          status: 'awaiting_reply',
          createdAt: '2099-01-01T00:00:00.000Z',
        },
      ])
    }
  })

  it('loads owned listings through the explicit you read model', () => {
    const backend = createPrototypeBackend()

    backend.createListing({
      actorUserId: 'viewer-1',
      request: {
        species: 'cat',
        name: 'Nala',
        ageText: '2 years',
        sex: 'female',
        areaLabel: 'Maafannu, Male',
        story: 'Gentle indoor cat.',
        tagIds: [],
        imageObjectKeys: [],
      },
    })

    const result = backend.getYouReadModel({ viewerId: 'viewer-1' })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.ownedListings).toEqual([
        expect.objectContaining({
          name: 'Nala',
          status: 'pending',
          listedBy: expect.objectContaining({
            kind: 'user',
            id: 'viewer-1',
          }),
        }),
      ])
    }
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

  it('uses real infra defaults: ISO timestamps, prefixed uuids, and MV#### reference codes', () => {
    const backend = createPrototypeBackend()

    const first = backend.createReport({
      request: {
        reportKind: 'found',
        species: 'bird',
        birdSpecies: 'Budgerigar',
        areaLabel: 'Maafannu, Malé',
        description: 'Found a tame budgie near the harbour.',
      },
    })
    const second = backend.createReport({
      request: {
        reportKind: 'found',
        species: 'bird',
        birdSpecies: 'Budgerigar',
        areaLabel: 'Maafannu, Malé',
        description: 'Found another tame budgie near the harbour.',
      },
    })

    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)
    if (first.ok && second.ok) {
      expect(first.data.report.id).toMatch(/^report-[0-9a-f-]{36}$/)
      expect(first.data.report.id).not.toBe(second.data.report.id)
      expect(first.data.report.referenceCode).toMatch(/^MV\d+$/)
      expect(new Date(first.data.report.createdAt).toISOString()).toBe(first.data.report.createdAt)
    }
  })

  it('accepts injected deterministic infra deps for now/generateId/generateReferenceCode', () => {
    let idCounter = 0
    const backend = createPrototypeBackend({
      now: () => '2099-01-01T00:00:00.000Z',
      generateId: (prefix) => `${prefix}-fake-${++idCounter}`,
      generateReferenceCode: () => 'MV9999',
    })

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
      expect(result.data.report.id).toBe('report-fake-1')
      expect(result.data.report.referenceCode).toBe('MV9999')
      expect(result.data.report.createdAt).toBe('2099-01-01T00:00:00.000Z')
    }
  })

  it('does not share mutable state between separate backend instances', () => {
    const backendA = createPrototypeBackend()
    const backendB = createPrototypeBackend()

    backendA.toggleSavedListing({ listingId: 'mishka', viewerId: 'viewer-1' })

    const hydratedA = backendA.hydrateAppShell({ viewerId: 'viewer-1' })
    const hydratedB = backendB.hydrateAppShell({ viewerId: 'viewer-1' })

    expect(hydratedA.listings.find((listing) => listing.id === 'mishka')?.savedByViewer).toBe(true)
    expect(hydratedB.listings.find((listing) => listing.id === 'mishka')?.savedByViewer).toBe(false)
  })
})
