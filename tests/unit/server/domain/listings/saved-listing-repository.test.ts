import { drizzle } from 'drizzle-orm/d1'
import { afterEach, describe, expect, it } from 'vitest'
import { Miniflare } from 'miniflare'

import type { ListingAggregate } from '../../../../../src/server/domain/listings/listing-mapper'
import { createAsyncListingRepository, createInMemoryListingRepository } from '../../../../../src/server/domain/listings/listing-repository'
import {
  createAsyncSavedListingRepositoryFromListingRepository,
  type AsyncSavedListingRepository,
} from '../../../../../src/server/domain/listings/saved-listing-repository'
import { createD1MigrationClient } from '../../../../../src/server/infra/db/client'
import { applyDbMigrations } from '../../../../../src/server/infra/db/migrate'
import * as schema from '../../../../../src/server/infra/db/schema'
import { createDrizzleListingRepository } from '../../../../../src/server/infra/repositories/drizzle-listing-repository'
import { createDrizzleSavedListingRepository } from '../../../../../src/server/infra/repositories/drizzle-saved-listing-repository'

const owner = {
  id: 'user-1',
  googleSub: 'sub-1',
  email: 'owner@example.com',
  displayName: 'Aishath Ali',
  avatarUrl: null,
  globalRole: 'user',
  createdAt: '2026-06-01T08:00:00.000Z',
  updatedAt: '2026-06-01T08:00:00.000Z',
} as const

const birdListing: ListingAggregate = {
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
    listedByUserId: owner.id,
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
  listedByUser: owner,
  savedByViewer: false,
}

const catListing: ListingAggregate = {
  ...birdListing,
  listing: {
    ...birdListing.listing,
    id: 'listing-2',
    slug: 'mishka',
    species: 'cat',
    birdSpecies: null,
    name: 'Mishka',
  },
  tags: [{ id: 'tag-2', slug: 'kitten', label: 'Kitten', speciesScope: 'cat', createdAt: '2026-06-01T08:00:00.000Z' }],
}

let miniflare: Miniflare | undefined

async function createMiniflareRepositories() {
  miniflare = new Miniflare({
    modules: true,
    script: `export default { fetch() { return new Response("ok") } }`,
    d1Databases: { DB: 'pet-buddies-saved-listing-repository-test-db' },
  })
  const d1 = await miniflare.getD1Database('DB')
  await applyDbMigrations(createD1MigrationClient(d1))
  const db = drizzle(d1, { schema })
  const listingRepository = createDrizzleListingRepository({ db })
  await listingRepository.create(birdListing)
  await listingRepository.create(catListing)

  return createDrizzleSavedListingRepository({ db, listingRepository })
}

afterEach(async () => {
  await miniflare?.dispose()
  miniflare = undefined
})

describe.each([
  {
    name: 'in-memory saved adapter',
    createRepository: async () => {
      const listingRepository = createAsyncListingRepository(
        createInMemoryListingRepository({
          listings: [birdListing, catListing],
        }),
      )
      return createAsyncSavedListingRepositoryFromListingRepository(listingRepository)
    },
  },
  {
    name: 'Drizzle D1 saved adapter',
    createRepository: createMiniflareRepositories,
  },
])('async saved listing repository contract: $name', ({ createRepository }) => {
  it('toggles and lists Viewer-scoped saved listings', async () => {
    const repository: AsyncSavedListingRepository = await createRepository()

    expect(await repository.listByViewer(owner.id)).toEqual([])

    expect(await repository.toggle({ viewerId: owner.id, listingId: 'listing-2' })).toBe(true)
    expect(await repository.toggle({ viewerId: owner.id, listingId: 'listing-1' })).toBe(true)
    expect((await repository.listByViewer(owner.id)).map((aggregate) => aggregate.listing.id).sort()).toEqual([
      'listing-1',
      'listing-2',
    ])
    expect((await repository.listByViewer(owner.id)).every((aggregate) => aggregate.savedByViewer)).toBe(true)

    expect(await repository.toggle({ viewerId: owner.id, listingId: 'listing-2' })).toBe(false)
    expect((await repository.listByViewer(owner.id)).map((aggregate) => aggregate.listing.id)).toEqual(['listing-1'])
  }, 15_000)
})
