import { describe, expect, it, vi } from 'vitest'

import { postListing } from '../../../../../src/server/http/listings/post-listing'

describe('post listing handler', () => {
  it('stays transport-thin and delegates to the create listing use case', () => {
    const execute = vi.fn().mockReturnValue({
      ok: true,
      data: {
        listing: {
          id: 'listing-new',
        },
      },
    })

    const result = postListing({
      request: {
        species: 'cat',
        name: 'Mishka',
        ageText: '8 months',
        areaLabel: 'Male',
        story: 'Playful kitten',
        tagIds: [],
        imageObjectKeys: [],
      },
      actorUserId: 'user-1',
      organization: null,
      tags: [],
      createListing: { execute },
    })

    expect(execute).toHaveBeenCalledWith({
      request: {
        species: 'cat',
        name: 'Mishka',
        ageText: '8 months',
        areaLabel: 'Male',
        story: 'Playful kitten',
        tagIds: [],
        imageObjectKeys: [],
      },
      actorUserId: 'user-1',
      organization: null,
      tags: [],
    })
    expect(result.ok).toBe(true)
  })
})
