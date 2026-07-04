import { drizzle } from 'drizzle-orm/d1'
import { afterEach, describe, expect, it } from 'vitest'
import { Miniflare } from 'miniflare'

import type { ListingAggregate } from '../../../../../src/server/domain/listings/listing-mapper'
import {
  createAsyncListingRepository,
  createInMemoryListingRepository,
  type AsyncListingRepository,
  type ListingRepository,
} from '../../../../../src/server/domain/listings/listing-repository'
import { createD1MigrationClient } from '../../../../../src/server/infra/db/client'
import { applyDbMigrations } from '../../../../../src/server/infra/db/migrate'
import * as schema from '../../../../../src/server/infra/db/schema'
import { createDrizzleListingRepository } from '../../../../../src/server/infra/repositories/drizzle-listing-repository'

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

const catAggregate: ListingAggregate = {
  listing: {
    id: 'listing-2',
    slug: 'mishka',
    species: 'cat',
    birdSpecies: null,
    name: 'Mishka',
    ageText: '4 months',
    sex: 'unknown',
    areaLabel: 'Hulhumale',
    story: 'Curious kitten',
    status: 'pending',
    listedByUserId: null,
    organizationId: 'org-1',
    publishedAt: null,
    adoptedAt: null,
    rejectedAt: null,
    rejectedReason: null,
    createdAt: '2026-07-03T08:00:00.000Z',
    updatedAt: '2026-07-03T08:00:00.000Z',
  },
  images: [
    {
      id: 'image-1',
      listingId: 'listing-2',
      objectKey: 'listings/mishka.jpg',
      publicUrl: 'https://cdn.example.com/listings/mishka.jpg',
      sortOrder: 0,
      width: 1200,
      height: 800,
      createdAt: '2026-07-03T08:00:00.000Z',
    },
  ],
  tags: [{ id: 'tag-2', slug: 'kitten', label: 'Kitten', speciesScope: 'cat', createdAt: '2026-06-01T08:00:00.000Z' }],
  organization: {
    id: 'org-1',
    slug: 'island-rescue',
    name: 'Island Rescue',
    kind: 'rescue',
    description: null,
    areaLabel: 'Hulhumale',
    contactEmail: null,
    contactPhone: null,
    isVerified: true,
    verifiedAt: '2026-06-01T08:00:00.000Z',
    createdAt: '2026-06-01T08:00:00.000Z',
    updatedAt: '2026-06-01T08:00:00.000Z',
  },
  listedByUser: null,
  savedByViewer: false,
}

let miniflare: Miniflare | undefined

async function createMiniflareRepository() {
  miniflare = new Miniflare({
    modules: true,
    script: `export default { fetch() { return new Response("ok") } }`,
    d1Databases: { DB: 'pet-buddies-listing-repository-test-db' },
  })
  const d1 = await miniflare.getD1Database('DB')
  await applyDbMigrations(createD1MigrationClient(d1))

  return createDrizzleListingRepository({
    db: drizzle(d1, { schema }),
  })
}

afterEach(async () => {
  await miniflare?.dispose()
  miniflare = undefined
})

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

describe.each([
  {
    name: 'in-memory async adapter',
    createRepository: async () =>
      createAsyncListingRepository(
        createInMemoryListingRepository({
          listings: [initialAggregate],
        }),
      ),
  },
  {
    name: 'Drizzle D1 adapter',
    createRepository: async () => {
      const repository = await createMiniflareRepository()
      await repository.create(initialAggregate)
      return repository
    },
  },
])('async listing repository contract: $name', ({ createRepository }) => {
  it('supports browse/get/create/update/toggle operations', async () => {
    const repository: AsyncListingRepository = await createRepository()

    expect(await repository.browse({ species: 'bird' })).toHaveLength(1)
    expect((await repository.getBySlug('coco'))?.listing.id).toBe('listing-1')
    expect((await repository.getById('listing-1'))?.listing.slug).toBe('coco')

    const created = await repository.create(catAggregate)

    expect(created).toMatchObject({
      listing: { id: 'listing-2', slug: 'mishka', status: 'pending' },
      organization: { id: 'org-1', name: 'Island Rescue' },
    })
    expect(created.images).toHaveLength(1)
    expect(created.tags.map((tag) => tag.slug)).toEqual(['kitten'])
    expect(await repository.browse({ species: 'cat' })).toHaveLength(1)

    await repository.updateStatus('listing-2', 'live')
    expect((await repository.getById('listing-2'))?.listing.status).toBe('live')

    expect(await repository.toggleSavedListing({ listingId: 'listing-1', viewerId: 'user-1' })).toBe(true)
    expect((await repository.listAll('user-1')).find((aggregate) => aggregate.listing.id === 'listing-1')?.savedByViewer).toBe(
      true,
    )
    expect(await repository.toggleSavedListing({ listingId: 'listing-1', viewerId: 'user-1' })).toBe(false)
    expect((await repository.listAll('user-1')).find((aggregate) => aggregate.listing.id === 'listing-1')?.savedByViewer).toBe(
      false,
    )
  }, 15_000)
})
