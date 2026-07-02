import { describe, expect, it } from 'vitest'

import type { ListingAggregate } from '../../../../../src/server/domain/listings/listing-mapper'
import {
  createInMemoryListingRepository,
  type ListingRepository,
} from '../../../../../src/server/domain/listings/listing-repository'

const initialAggregate: ListingAggregate = {
  listing: {
    id: 'listing-1',
    slug: 'coco',
    species: 'bird',
    birdSpecies: 'Cockatiel',
    name: 'Coco',
    ageText: '2 years',
    sex: 'female',
    areaLabel: 'Male',
    story: 'Friendly rescue bird',
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
  tags: [{ id: 'tag-1', slug: 'playful', label: 'Playful', speciesScope: 'both', createdAt: '2026-06-01T08:00:00.000Z' }],
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

describe('listing repository seam', () => {
  it('supports browse/get/create/update/toggle against an in-memory adapter', () => {
    const repository: ListingRepository = createInMemoryListingRepository({
      listings: [initialAggregate],
    })

    expect(repository.browse({ species: 'bird' })).toHaveLength(1)
    expect(repository.getBySlug('coco')?.listing.id).toBe('listing-1')
    expect(repository.getById('listing-1')?.listing.slug).toBe('coco')

    repository.create({
      ...initialAggregate,
      listing: {
        ...initialAggregate.listing,
        id: 'listing-2',
        slug: 'mishka',
        species: 'cat',
        birdSpecies: null,
        name: 'Mishka',
        status: 'pending',
      },
    })

    expect(repository.browse({ species: 'cat' })).toHaveLength(1)

    repository.updateStatus('listing-2', 'live')
    expect(repository.getById('listing-2')?.listing.status).toBe('live')

    expect(repository.toggleSavedListing({ listingId: 'listing-1', viewerId: 'viewer-1' })).toBe(true)
    expect(repository.toggleSavedListing({ listingId: 'listing-1', viewerId: 'viewer-1' })).toBe(false)
  })
})
