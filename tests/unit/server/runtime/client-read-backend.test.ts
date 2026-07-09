import { describe, expect, it, vi } from 'vitest'

import { createServerFnReadBackend, type ServerFnReads } from '../../../../src/server/runtime/client-read-backend'

function makeReads(overrides: Partial<ServerFnReads> = {}): ServerFnReads {
  return {
    getBrowseListings: vi.fn().mockResolvedValue({ items: [], pageInfo: { nextCursor: null }, availableTags: [] }),
    fetchListingDetail: vi.fn(),
    fetchSavedListings: vi.fn().mockResolvedValue({ items: [] }),
    fetchYouReadModel: vi.fn().mockResolvedValue({ sentAdoptionInquiries: [], ownedListings: [] }),
    fetchClinics: vi.fn().mockResolvedValue({ items: [] }),
    ...overrides,
  }
}

describe('createServerFnReadBackend', () => {
  it('proxies loader reads through the read server functions', async () => {
    const fetchSavedListings = vi.fn().mockResolvedValue({ items: [] })
    const backend = createServerFnReadBackend(makeReads({ fetchSavedListings }))

    const result = await backend.listSavedListings({ viewerId: 'user-demo-viewer' })

    expect(fetchSavedListings).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ ok: true, data: { items: [] } })
  })

  it('falls back to the in-memory backend when a read server function is unreachable', async () => {
    const backend = createServerFnReadBackend(
      makeReads({ fetchClinics: vi.fn().mockRejectedValue(new Error('offline')) }),
    )

    const result = await backend.listClinics()

    // The in-memory fallback still serves the seeded clinic directory.
    expect(result.ok && result.data.items.length).toBeGreaterThan(0)
  })
})
