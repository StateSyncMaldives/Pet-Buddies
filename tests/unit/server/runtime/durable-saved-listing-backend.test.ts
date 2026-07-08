import { describe, expect, it } from 'vitest'

import type { ListingAggregate } from '../../../../src/server/domain/listings/listing-mapper'
import { createDrizzleListingRepository } from '../../../../src/server/infra/repositories/drizzle-listing-repository'
import { seedDurableStore } from '../../../../src/server/infra/db/seed-durable-store'
import { createDurableSavedListingBackend } from '../../../../src/server/runtime/durable-saved-listing-backend'
import { DEMO_VIEWER_USER } from '../../../../src/server/runtime/demo-identity'
import { useMiniflareD1 } from '../../../helpers/miniflare-d1'

const createMiniflareD1 = useMiniflareD1('pet-buddies-durable-saved-backend-test-db')
const seededAt = '2026-07-02T08:00:00.000Z'

function demoListing(): ListingAggregate {
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

describe('createDurableSavedListingBackend', () => {
  it('toggles and lists saved listings as ApiResult, persisting across fresh backends', async () => {
    const { db } = await createMiniflareD1()
    await seedDurableStore({ db })
    await createDrizzleListingRepository({ db }).create(demoListing())

    const backend = createDurableSavedListingBackend({ db })

    const empty = await backend.listSavedListings({ viewerId: DEMO_VIEWER_USER.id })
    expect(empty.ok).toBe(true)
    expect(empty.ok && empty.data.items).toEqual([])

    const toggled = await backend.toggleSavedListing({ listingId: 'listing-demo', viewerId: DEMO_VIEWER_USER.id })
    expect(toggled).toEqual({ ok: true, data: { listingId: 'listing-demo', saved: true } })

    // A fresh backend instance over the same D1 is the refresh analog.
    const fresh = createDurableSavedListingBackend({ db })
    const listed = await fresh.listSavedListings({ viewerId: DEMO_VIEWER_USER.id })
    expect(listed.ok && listed.data.items.map((item) => item.id)).toEqual(['listing-demo'])

    const untoggled = await fresh.toggleSavedListing({ listingId: 'listing-demo', viewerId: DEMO_VIEWER_USER.id })
    expect(untoggled).toEqual({ ok: true, data: { listingId: 'listing-demo', saved: false } })

    const after = await fresh.listSavedListings({ viewerId: DEMO_VIEWER_USER.id })
    expect(after.ok && after.data.items).toEqual([])
  }, 15_000)
})
