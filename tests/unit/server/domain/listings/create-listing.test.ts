import { describe, expect, it } from 'vitest'

import { createCreateListingUseCase } from '../../../../../src/server/domain/listings/create-listing'
import type { CreateListingRequest } from '../../../../../src/server/contracts/api'
import { createInMemoryListingRepository } from '../../../../../src/server/domain/listings/listing-repository'

const validBirdRequest: CreateListingRequest = {
  species: 'bird',
  birdSpecies: 'Cockatiel',
  name: 'Mango',
  ageText: '2 years',
  sex: 'female',
  areaLabel: 'Male',
  story: 'Sweet rescue bird',
  tagIds: ['hand-tame'],
  imageObjectKeys: ['image-1'],
  organizationId: 'org-1',
}

describe('create listing use case', () => {
  it('creates a valid listing and returns a mapped CreateListingResponse', () => {
    const repository = createInMemoryListingRepository({ listings: [] })
    const useCase = createCreateListingUseCase({
      repository,
      now: () => '2026-07-02T08:00:00.000Z',
      generateId: () => 'listing-new',
      generateSlug: (name) => name.toLowerCase(),
      toPublicImageUrl: (objectKey) => `https://cdn.example/${objectKey}`,
    })

    const result = useCase.execute({
      request: validBirdRequest,
      actorUserId: null,
      organization: {
        id: 'org-1',
        slug: 'feather-friends',
        name: 'Feather Friends',
        kind: 'rescue',
        areaLabel: 'Male',
        isVerified: true,
      },
      tags: [{ id: 'hand-tame', slug: 'hand-tame', label: 'Hand tame', speciesScope: 'bird', createdAt: '2026-06-01T08:00:00.000Z' }],
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.listing.status).toBe('pending')
      expect(result.data.listing.listedBy).toEqual({
        kind: 'organization',
        id: 'org-1',
        displayName: 'Feather Friends',
      })
    }
  })

  it('rejects invalid cat/bird combinations with VALIDATION_ERROR', () => {
    const repository = createInMemoryListingRepository({ listings: [] })
    const useCase = createCreateListingUseCase({
      repository,
      now: () => '2026-07-02T08:00:00.000Z',
      generateId: () => 'listing-new',
      generateSlug: (name) => name.toLowerCase(),
      toPublicImageUrl: (objectKey) => `https://cdn.example/${objectKey}`,
    })

    const result = useCase.execute({
      request: {
        ...validBirdRequest,
        species: 'cat',
      },
      actorUserId: 'user-1',
      organization: null,
      tags: [],
    })

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Cats cannot include bird species.',
      },
    })
  })

  it('stores every new listing as pending in the repository', () => {
    const repository = createInMemoryListingRepository({ listings: [] })
    const useCase = createCreateListingUseCase({
      repository,
      now: () => '2026-07-02T08:00:00.000Z',
      generateId: () => 'listing-new',
      generateSlug: (name) => name.toLowerCase(),
      toPublicImageUrl: (objectKey) => `https://cdn.example/${objectKey}`,
    })

    useCase.execute({
      request: {
        ...validBirdRequest,
        organizationId: undefined,
      },
      actorUserId: 'user-1',
      organization: null,
      tags: [],
    })

    expect(repository.getById('listing-new')?.listing.status).toBe('pending')
  })
})
