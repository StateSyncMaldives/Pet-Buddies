import { describe, expect, it } from 'vitest'

import type { ListingAggregate } from '../../../../../src/server/domain/listings/listing-mapper'
import { createDrizzleListingRepository } from '../../../../../src/server/infra/repositories/drizzle-listing-repository'
import { createDrizzleSavedListingRepository } from '../../../../../src/server/infra/repositories/drizzle-saved-listing-repository'
import * as schema from '../../../../../src/server/infra/db/schema'
import { seedDurableStore } from '../../../../../src/server/infra/db/seed-durable-store'
import { DEMO_MODERATOR_USER, DEMO_VIEWER_USER } from '../../../../../src/server/runtime/demo-identity'
import { useMiniflareD1 } from '../../../../helpers/miniflare-d1'

const createMiniflareD1 = useMiniflareD1('pet-buddies-seed-durable-store-test-db')

const seededAt = '2026-07-02T08:00:00.000Z'

function listingOwnedByDemoViewer(): ListingAggregate {
  return {
    listing: {
      id: 'listing-demo',
      slug: 'listing-demo',
      species: 'cat',
      birdSpecies: null,
      name: 'Mishka',
      ageText: '8 months',
      sex: 'female',
      areaLabel: 'Maafannu, Malé',
      story: 'A friendly demo cat.',
      status: 'live',
      listedByUserId: DEMO_VIEWER_USER.id,
      organizationId: null,
      publishedAt: seededAt,
      adoptedAt: null,
      rejectedAt: null,
      rejectedReason: null,
      createdAt: seededAt,
      updatedAt: seededAt,
    },
    images: [],
    tags: [],
    organization: null,
    listedByUser: DEMO_VIEWER_USER,
    savedByViewer: false,
  }
}

describe('seedDurableStore', () => {
  it('seeds the demo Viewer and moderator users idempotently', async () => {
    const { db } = await createMiniflareD1()

    await seedDurableStore({ db })
    await seedDurableStore({ db }) // second run must neither duplicate nor throw

    const ids = (await db.select({ id: schema.users.id }).from(schema.users).all()).map((row) => row.id)
    expect(ids.filter((id) => id === DEMO_VIEWER_USER.id)).toHaveLength(1)
    expect(ids.filter((id) => id === DEMO_MODERATOR_USER.id)).toHaveLength(1)
  }, 15_000)

  it('persists the seed listings idempotently so a fresh repository can browse them', async () => {
    const { db } = await createMiniflareD1()

    await seedDurableStore({ db })
    await seedDurableStore({ db }) // re-seeding must not duplicate

    const repository = createDrizzleListingRepository({ db })
    const cats = await repository.browse({ species: 'cat' })
    expect(cats.some((aggregate) => aggregate.listing.id === 'mishka')).toBe(true)

    const rows = await db.select({ id: schema.listings.id }).from(schema.listings).all()
    expect(rows.filter((row) => row.id === 'mishka')).toHaveLength(1)
  }, 15_000)

  it('lets the seeded demo Viewer save a listing that survives a fresh repository read', async () => {
    const { db } = await createMiniflareD1()
    await seedDurableStore({ db })

    const listingRepository = createDrizzleListingRepository({ db })
    await listingRepository.create(listingOwnedByDemoViewer())

    // Save through one repository instance (the write).
    const savedWriter = createDrizzleSavedListingRepository({ db, listingRepository })
    expect(await savedWriter.toggle({ viewerId: DEMO_VIEWER_USER.id, listingId: 'listing-demo' })).toBe(true)

    // Read through fresh instances (the refresh analog): the save persists.
    const freshListingRepository = createDrizzleListingRepository({ db })
    const savedReader = createDrizzleSavedListingRepository({ db, listingRepository: freshListingRepository })
    const saved = await savedReader.listByViewer(DEMO_VIEWER_USER.id)
    expect(saved.map((aggregate) => aggregate.listing.id)).toEqual(['listing-demo'])
  }, 15_000)
})
