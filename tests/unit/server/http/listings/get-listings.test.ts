import { describe, expect, it, vi } from 'vitest'

import { getListingDetail } from '../../../../../src/server/http/listings/get-listing-detail'
import { getListings } from '../../../../../src/server/http/listings/get-listings'

describe('listing http handlers', () => {
  it('keeps the browse handler thin and delegates to the listing service', () => {
    const browseListings = vi.fn().mockReturnValue({
      ok: true,
      data: {
        items: [],
        pageInfo: { nextCursor: null },
        availableTags: [],
      },
    })

    const result = getListings({
      query: { species: 'cat', search: 'mishka' },
      listingService: {
        browseListings,
        getListingDetail: vi.fn(),
      },
    })

    expect(browseListings).toHaveBeenCalledWith({ species: 'cat', search: 'mishka' })
    expect(result.ok).toBe(true)
  })

  it('keeps the detail handler thin and delegates to the listing service', () => {
    const getListingDetailSpy = vi.fn().mockReturnValue({
      ok: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Listing not found.',
      },
    })

    const result = getListingDetail({
      params: { slugOrId: 'missing' },
      listingService: {
        browseListings: vi.fn(),
        getListingDetail: getListingDetailSpy,
      },
    })

    expect(getListingDetailSpy).toHaveBeenCalledWith({ slugOrId: 'missing' })
    expect(result).toEqual({
      ok: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Listing not found.',
      },
    })
  })
})
