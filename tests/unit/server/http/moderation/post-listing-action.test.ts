import { describe, expect, it, vi } from 'vitest'

import { postListingAction } from '../../../../../src/server/http/moderation/post-listing-action'

describe('post listing moderation action handler', () => {
  it('keeps the moderation handler thin and delegates to the use case', () => {
    const moderateListing = vi.fn().mockReturnValue({
      ok: true,
      data: {
        moderationEventId: 'mod-event-1',
        listing: {
          id: 'listing-1',
          slug: 'mango',
          species: 'bird',
          birdSpecies: 'Cockatiel',
          name: 'Mango',
          ageText: '2 years',
          sex: 'female',
          areaLabel: 'Male',
          status: 'live',
          primaryImageUrl: null,
          tags: [],
          organization: null,
          savedByViewer: false,
          publishedAt: '2026-07-02T12:00:00.000Z',
          story: 'Gentle bird ready for adoption.',
          images: [],
          listedBy: {
            kind: 'organization',
            id: 'org-1',
            displayName: 'Feather Friends',
          },
          inquiryAllowed: true,
        },
      },
    })

    const result = postListingAction({
      listingId: 'listing-1',
      actorUserId: 'moderator-1',
      request: {
        action: 'approved',
        reason: 'Looks good',
      },
      moderateListing: {
        execute: moderateListing,
      },
    })

    expect(moderateListing).toHaveBeenCalledWith({
      listingId: 'listing-1',
      actorUserId: 'moderator-1',
      request: {
        action: 'approved',
        reason: 'Looks good',
      },
    })
    expect(result.ok).toBe(true)
  })
})
