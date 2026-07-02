import { describe, expect, it, vi } from 'vitest'

import { postInquiry } from '../../../../../src/server/http/inquiries/post-inquiry'
import { postSaveListing } from '../../../../../src/server/http/listings/post-save-listing'

describe('engagement handlers', () => {
  it('delegates save toggling through a thin handler', () => {
    const execute = vi.fn().mockReturnValue({ ok: true, data: { listingId: 'listing-1', saved: true } })

    const result = postSaveListing({
      params: { listingId: 'listing-1' },
      viewerId: 'viewer-1',
      toggleSavedListing: { execute },
    })

    expect(execute).toHaveBeenCalledWith({ listingId: 'listing-1', viewerId: 'viewer-1' })
    expect(result.ok).toBe(true)
  })

  it('delegates inquiry creation through a thin handler', () => {
    const execute = vi.fn().mockReturnValue({ ok: true, data: { inquiry: { id: 'inq-1', listingId: 'listing-1', status: 'awaiting_reply', createdAt: '2026-07-02T08:00:00.000Z' } } })

    const result = postInquiry({
      request: { listingId: 'listing-1', message: 'Hi' },
      viewerId: 'viewer-1',
      createInquiry: { execute },
    })

    expect(execute).toHaveBeenCalledWith({ listingId: 'listing-1', message: 'Hi', senderUserId: 'viewer-1' })
    expect(result.ok).toBe(true)
  })
})
