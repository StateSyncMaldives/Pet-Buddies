import { describe, expect, it } from 'vitest'

import { createToggleSavedListingUseCase } from '../../../../../src/server/domain/listings/toggle-saved-listing'
import type { ListingAggregate } from '../../../../../src/server/domain/listings/listing-mapper'
import { createInMemoryListingRepository } from '../../../../../src/server/domain/listings/listing-repository'

const listing: ListingAggregate = {
  listing: {
    id: 'listing-1',
    slug: 'coco',
    species: 'cat',
    birdSpecies: null,
    name: 'Coco',
    ageText: '2 years',
    sex: 'female',
    areaLabel: 'Male',
    story: 'Calm cat',
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
  tags: [],
  organization: null,
  listedByUser: {
    id: 'user-1',
    googleSub: 'sub-1',
    email: 'owner@example.com',
    emailVerified: true,
    displayName: 'Aishath Ali',
    avatarUrl: null,
    role: 'user',
    banned: false,
    createdAt: '2026-06-01T08:00:00.000Z',
    updatedAt: '2026-06-01T08:00:00.000Z',
  },
  savedByViewer: false,
}

describe('toggle saved listing', () => {
  it('is idempotent from the client perspective', () => {
    const repository = createInMemoryListingRepository({ listings: [listing] })
    const useCase = createToggleSavedListingUseCase({ repository })

    expect(useCase.execute({ listingId: 'listing-1', viewerId: 'viewer-1' })).toEqual({
      ok: true,
      data: {
        listingId: 'listing-1',
        saved: true,
      },
    })

    expect(useCase.execute({ listingId: 'listing-1', viewerId: 'viewer-1' })).toEqual({
      ok: true,
      data: {
        listingId: 'listing-1',
        saved: false,
      },
    })
  })
})
