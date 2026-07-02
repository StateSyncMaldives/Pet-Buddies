import { describe, expect, it } from 'vitest'

import type { ListingAggregate } from '../../../../../src/server/domain/listings/listing-mapper'
import { createInMemoryListingRepository } from '../../../../../src/server/domain/listings/listing-repository'
import { createListingService } from '../../../../../src/server/domain/listings/listing-service'

const liveCat: ListingAggregate = {
  listing: {
    id: 'listing-1',
    slug: 'mishka',
    species: 'cat',
    birdSpecies: null,
    name: 'Mishka',
    ageText: '8 months',
    sex: 'female',
    areaLabel: 'Maafannu, Malé',
    story: 'Playful kitten',
    status: 'live',
    listedByUserId: 'user-1',
    organizationId: null,
    publishedAt: '2026-07-02T08:00:00.000Z',
    adoptedAt: null,
    rejectedAt: null,
    rejectedReason: null,
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-07-02T08:00:00.000Z',
  },
  images: [],
  tags: [{ id: 'tag-1', slug: 'kitten', label: 'Kitten', speciesScope: 'cat', createdAt: '2026-06-01T08:00:00.000Z' }],
  organization: null,
  listedByUser: {
    id: 'user-1',
    googleSub: 'sub-1',
    email: 'owner@example.com',
    displayName: 'Aishath Ali',
    avatarUrl: null,
    globalRole: 'user',
    createdAt: '2026-06-01T08:00:00.000Z',
    updatedAt: '2026-06-01T08:00:00.000Z',
  },
  savedByViewer: false,
}

const liveBird: ListingAggregate = {
  listing: {
    id: 'listing-2',
    slug: 'kiwi',
    species: 'bird',
    birdSpecies: 'Budgerigar',
    name: 'Kiwi',
    ageText: '1 year',
    sex: 'male',
    areaLabel: 'Hulhumalé',
    story: 'Hand-tame and chirpy',
    status: 'live',
    listedByUserId: 'user-2',
    organizationId: null,
    publishedAt: '2026-07-02T08:00:00.000Z',
    adoptedAt: null,
    rejectedAt: null,
    rejectedReason: null,
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-07-02T08:00:00.000Z',
  },
  images: [],
  tags: [{ id: 'tag-2', slug: 'hand-tame', label: 'Hand tame', speciesScope: 'bird', createdAt: '2026-06-01T08:00:00.000Z' }],
  organization: null,
  listedByUser: {
    id: 'user-2',
    googleSub: 'sub-2',
    email: 'owner2@example.com',
    displayName: 'Hassan',
    avatarUrl: null,
    globalRole: 'user',
    createdAt: '2026-06-01T08:00:00.000Z',
    updatedAt: '2026-06-01T08:00:00.000Z',
  },
  savedByViewer: false,
}

const pendingBird: ListingAggregate = {
  ...liveBird,
  listing: {
    ...liveBird.listing,
    id: 'listing-3',
    slug: 'pixel',
    name: 'Pixel',
    status: 'pending',
  },
}

describe('listing service', () => {
  it('browses only live listings for the requested species', () => {
    const repository = createInMemoryListingRepository({ listings: [liveCat, liveBird, pendingBird] })
    const service = createListingService({ repository })

    const result = service.browseListings({ species: 'bird' })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.items.map((item) => item.slug)).toEqual(['kiwi'])
    }
  })

  it('applies tag filters and text search against name, area label, and tags', () => {
    const repository = createInMemoryListingRepository({ listings: [liveCat, liveBird] })
    const service = createListingService({ repository })

    const byTag = service.browseListings({ tagSlugs: ['hand-tame'] })
    const bySearch = service.browseListings({ search: 'hulhumalé' })
    const byTagSearch = service.browseListings({ search: 'kitten' })

    expect(byTag.ok && byTag.data.items.map((item) => item.slug)).toEqual(['kiwi'])
    expect(bySearch.ok && bySearch.data.items.map((item) => item.slug)).toEqual(['kiwi'])
    expect(byTagSearch.ok && byTagSearch.data.items.map((item) => item.slug)).toEqual(['mishka'])
  })

  it('returns a typed ListingDetail for detail lookups', () => {
    const repository = createInMemoryListingRepository({ listings: [liveCat] })
    const service = createListingService({ repository })

    const result = service.getListingDetail({ slugOrId: 'mishka' })

    expect(result).toEqual({
      ok: true,
      data: {
        item: expect.objectContaining({
          slug: 'mishka',
          inquiryAllowed: true,
        }),
      },
    })
  })

  it('returns NOT_FOUND for a missing listing slug or id', () => {
    const repository = createInMemoryListingRepository({ listings: [liveCat] })
    const service = createListingService({ repository })

    expect(service.getListingDetail({ slugOrId: 'missing' })).toEqual({
      ok: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Listing not found.',
      },
    })
  })
})
