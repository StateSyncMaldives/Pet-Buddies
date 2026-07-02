import { describe, expect, it } from 'vitest'

import { validateListingDraft } from '../../../../../src/server/domain/listings/listing-policy'

describe('validateListingDraft', () => {
  it('rejects birdSpecies on cat listings', () => {
    const result = validateListingDraft({
      species: 'cat',
      birdSpecies: 'Cockatiel',
      listedByUserId: 'user-1',
    })

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Cats cannot include bird species.',
      },
    })
  })

  it('requires allowlisted birdSpecies for bird listings', () => {
    const missingSpecies = validateListingDraft({
      species: 'bird',
      listedByUserId: 'user-1',
    })

    const invalidSpecies = validateListingDraft({
      species: 'bird',
      birdSpecies: 'Parrot',
      listedByUserId: 'user-1',
    })

    expect(missingSpecies).toEqual({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Bird listings require an allowlisted bird species.',
      },
    })

    expect(invalidSpecies).toEqual({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Bird listings require an allowlisted bird species.',
      },
    })
  })

  it('requires exactly one listing owner and organizations must be verified', () => {
    const noOwner = validateListingDraft({ species: 'cat' })
    const bothOwners = validateListingDraft({
      species: 'cat',
      listedByUserId: 'user-1',
      organization: { id: 'org-1', isVerified: true },
    })
    const unverifiedOrg = validateListingDraft({
      species: 'cat',
      organization: { id: 'org-1', isVerified: false },
    })

    expect(noOwner).toEqual({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'A listing owner must be exactly one of a user or a verified organization.',
      },
    })

    expect(bothOwners).toEqual({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'A listing owner must be exactly one of a user or a verified organization.',
      },
    })

    expect(unverifiedOrg).toEqual({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'A listing owner must be exactly one of a user or a verified organization.',
      },
    })
  })

  it('defaults every new listing to pending', () => {
    const result = validateListingDraft({
      species: 'bird',
      birdSpecies: 'Cockatiel',
      listedByUserId: 'user-1',
    })

    expect(result).toEqual({
      ok: true,
      value: {
        status: 'pending',
        birdSpecies: 'Cockatiel',
        listedByUserId: 'user-1',
        organizationId: null,
      },
    })
  })
})
