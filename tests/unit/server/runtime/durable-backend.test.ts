import { describe, expect, it } from 'vitest'

import { createInMemoryAsyncBackend } from '../../../../src/server/runtime/app-backend'
import { createDurableBackend } from '../../../../src/server/runtime/durable-backend'
import { createPrototypeBackend } from '../../../../src/server/runtime/prototype-backend'
import { seedDurableStore } from '../../../../src/server/infra/db/seed-durable-store'
import { DEMO_VIEWER_USER } from '../../../../src/server/runtime/demo-identity'
import { useMiniflareD1 } from '../../../helpers/miniflare-d1'

const createMiniflareD1 = useMiniflareD1('pet-buddies-durable-backend-test-db')

function createBackend(db: Parameters<typeof createDurableBackend>[0]['database']) {
  return createDurableBackend({ database: db, fallback: createInMemoryAsyncBackend(createPrototypeBackend()) })
}

describe('createDurableBackend', () => {
  it('browses the seeded live listings from D1', async () => {
    const { db } = await createMiniflareD1()
    await seedDurableStore({ db })

    const backend = createBackend(db)
    const cats = await backend.browseListings({ query: { species: 'cat' } })
    expect(cats.ok && cats.data.items.map((item) => item.id)).toContain('mishka')

    const detail = await backend.getListingDetail({ slugOrId: 'mishka' })
    expect(detail.ok && detail.data.item.name).toBe('Mishka')
  }, 15_000)

  it('persists a save so a fresh backend still lists it', async () => {
    const { db } = await createMiniflareD1()
    await seedDurableStore({ db })

    const backend = createBackend(db)
    const toggled = await backend.toggleSavedListing({ listingId: 'mishka', viewerId: DEMO_VIEWER_USER.id })
    expect(toggled.ok && toggled.data.saved).toBe(true)

    const fresh = createBackend(db)
    const saved = await fresh.listSavedListings({ viewerId: DEMO_VIEWER_USER.id })
    expect(saved.ok && saved.data.items.map((item) => item.id)).toEqual(['mishka'])
  }, 15_000)

  it('hydrates the app shell with durable listings and seed clinics', async () => {
    const { db } = await createMiniflareD1()
    await seedDurableStore({ db })

    const backend = createBackend(db)
    const shell = await backend.hydrateAppShell({ viewerId: DEMO_VIEWER_USER.id })
    expect(shell.listings.some((listing) => listing.id === 'mishka')).toBe(true)
    expect(shell.clinics.length).toBeGreaterThan(0)
  }, 15_000)
})
