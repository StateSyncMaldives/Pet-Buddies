import { describe, expect, it } from 'vitest'

import { routeLostFoundReport } from '../../../../../src/features/reports/report-routing'

describe('report routing', () => {
  it('routes cat reports to the cat rescue organization', () => {
    expect(routeLostFoundReport({ species: 'cat', reportKind: 'lost' })).toEqual({
      ok: true,
      value: {
        routedToOrganizationId: 'org-cat-rescue',
      },
    })
  })

  it('routes bird reports to the bird rescue organization and requires allowlisted birdSpecies', () => {
    expect(routeLostFoundReport({ species: 'bird', reportKind: 'found', birdSpecies: 'Cockatiel' })).toEqual({
      ok: true,
      value: {
        routedToOrganizationId: 'org-bird-rescue',
      },
    })

    expect(routeLostFoundReport({ species: 'bird', reportKind: 'found' })).toEqual({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Bird reports require an allowlisted bird species.',
      },
    })
  })
})
