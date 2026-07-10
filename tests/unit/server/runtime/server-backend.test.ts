import { describe, expect, it } from 'vitest'

import { createServerBackend } from '../../../../src/server/runtime/server-backend'
import { seedDurableStore } from '../../../../src/server/infra/db/seed-durable-store'
import { DEMO_VIEWER_USER } from '../../../../src/server/runtime/demo-identity'
import { useMiniflareD1 } from '../../../helpers/miniflare-d1'

const createMiniflareD1 = useMiniflareD1('pet-buddies-server-backend-test-db')

describe('createServerBackend', () => {
  it('falls back to the in-memory backend when no D1 database is available', async () => {
    // No worker env in vitest → getWorkerEnv() returns null → in-memory seed data.
    const backend = await createServerBackend()
    const cats = await backend.browseListings({ query: { species: 'cat' } })
    expect(cats.ok && cats.data.items.map((item) => item.id)).toContain('mishka')
  })

  it('auto-seeds an empty (migrated) D1 on first use', async () => {
    const { db } = await createMiniflareD1() // schema applied, no data
    const backend = await createServerBackend({ database: db })
    const cats = await backend.browseListings({ query: { species: 'cat' } })
    expect(cats.ok && cats.data.items.map((item) => item.id)).toContain('mishka')
  }, 15_000)

  it('uses the durable D1 backend when a database is provided, persisting writes', async () => {
    const { db } = await createMiniflareD1()
    await seedDurableStore({ db })

    const backend = await createServerBackend({ database: db })
    expect((await backend.toggleSavedListing({ listingId: 'mishka', viewerId: DEMO_VIEWER_USER.id })).ok).toBe(true)

    // A brand-new backend over the same D1 still sees the save (durable).
    const fresh = await createServerBackend({ database: db })
    const saved = await fresh.listSavedListings({ viewerId: DEMO_VIEWER_USER.id })
    expect(saved.ok && saved.data.items.map((item) => item.id)).toEqual(['mishka'])
  }, 15_000)
})
