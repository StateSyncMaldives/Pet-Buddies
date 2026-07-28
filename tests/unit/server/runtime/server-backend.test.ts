import { describe, expect, it } from 'vitest'

import { seedDurableStore } from '../../../../src/server/infra/db/seed-durable-store'
import { insertTestUsers, TEST_VIEWER_USER } from '../../../helpers/seed-users'
import { createServerBackend } from '../../../../src/server/runtime/server-backend'
import { useMiniflareD1 } from '../../../helpers/miniflare-d1'

const createMiniflareD1 = useMiniflareD1('pet-buddies-server-backend-test-db')

describe('createServerBackend', () => {
  it('refuses to serve in-memory demo data when no D1 database is available', async () => {
    await expect(createServerBackend()).rejects.toThrow('D1 database binding is required')
  })

  it('auto-seeds an empty (migrated) D1 on first use', async () => {
    const { db } = await createMiniflareD1()
    const backend = await createServerBackend({ database: db })
    const cats = await backend.browseListings({ query: { species: 'cat' } })
    expect(cats.ok && cats.data.items.map((item) => item.id)).toContain('mishka')
  }, 15_000)

  it('uses the durable D1 backend when a database is provided, persisting writes', async () => {
    const { db } = await createMiniflareD1()
    await seedDurableStore({ db })
    await insertTestUsers(db)

    const backend = await createServerBackend({ database: db })
    expect((await backend.toggleSavedListing({ listingId: 'mishka', viewerId: TEST_VIEWER_USER.id })).ok).toBe(true)

    const fresh = await createServerBackend({ database: db })
    const saved = await fresh.listSavedListings({ viewerId: TEST_VIEWER_USER.id })
    expect(saved.ok && saved.data.items.map((item) => item.id)).toEqual(['mishka'])
  }, 15_000)
})
