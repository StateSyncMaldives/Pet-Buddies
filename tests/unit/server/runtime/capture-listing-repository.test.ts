import { describe, expect, it } from 'vitest'

import type { ListingAggregate } from '../../../../src/server/domain/listings/listing-mapper'
import { createCaptureListingRepository } from '../../../../src/server/runtime/capture-listing-repository'

const aggregate: ListingAggregate = {
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
    status: 'pending',
    listedByUserId: 'user-1',
    organizationId: null,
    publishedAt: null,
    adoptedAt: null,
    rejectedAt: null,
    rejectedReason: null,
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-07-01T08:00:00.000Z',
  },
  images: [],
  tags: [],
  organization: null,
  listedByUser: null,
  savedByViewer: false,
}

describe('createCaptureListingRepository', () => {
  it('serves reads from the preloaded aggregate and captures a save by reference', () => {
    const { repository, getCaptured } = createCaptureListingRepository(aggregate)

    expect(repository.getById('listing-1')).toBe(aggregate)
    expect(repository.getBySlug('mishka')).toBe(aggregate)
    expect(repository.getById('missing')).toBeNull()
    expect(getCaptured()).toBeNull()

    const next: ListingAggregate = { ...aggregate, listing: { ...aggregate.listing, status: 'live' } }
    const returned = repository.save(next)

    expect(returned).toBe(next)
    expect(getCaptured()).toBe(next)
  })

  it('captures a created aggregate when there is no preloaded row', () => {
    const { repository, getCaptured } = createCaptureListingRepository()

    expect(repository.getById('listing-1')).toBeNull()

    const created = repository.create(aggregate)

    expect(created).toBe(aggregate)
    expect(getCaptured()).toBe(aggregate)
  })
})
