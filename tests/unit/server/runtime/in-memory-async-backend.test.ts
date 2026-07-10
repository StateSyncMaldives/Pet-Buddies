import { describe, expect, it } from 'vitest'

import { createPrototypeBackend } from '../../../../src/server/runtime/prototype-backend'
import { createInMemoryAsyncBackend } from '../../../../src/server/runtime/app-backend'

describe('createInMemoryAsyncBackend', () => {
  it('exposes the in-memory prototype backend behind an async interface', async () => {
    const sync = createPrototypeBackend()
    const asyncBackend = createInMemoryAsyncBackend(sync)

    const browse = await asyncBackend.browseListings({ query: { species: 'cat' } })
    expect(browse).toEqual(sync.browseListings({ query: { species: 'cat' } }))

    const clinics = await asyncBackend.listClinics()
    expect(clinics).toEqual(sync.listClinics())
  })

  it('reflects a toggled save when listing saved listings through the async facade', async () => {
    const sync = createPrototypeBackend()
    const asyncBackend = createInMemoryAsyncBackend(sync)
    const viewerId = 'Aishath Ali'

    const before = await asyncBackend.listSavedListings({ viewerId })
    expect(before.ok && before.data.items).toEqual([])

    const toggled = await asyncBackend.toggleSavedListing({ listingId: 'mishka', viewerId })
    expect(toggled.ok && toggled.data.saved).toBe(true)

    const after = await asyncBackend.listSavedListings({ viewerId })
    expect(after.ok && after.data.items.map((item) => item.id)).toEqual(['mishka'])
  })
})
