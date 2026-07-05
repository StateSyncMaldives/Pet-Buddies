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
  imageObjectKeys: ['listing-images/media-1.jpg'],
  organizationId: 'org-1',
}

function createUseCase(repository = createInMemoryListingRepository({ listings: [] })) {
  return {
    repository,
    useCase: createCreateListingUseCase({
      repository,
      now: () => '2026-07-02T08:00:00.000Z',
      generateId: () => 'listing-new',
      generateSlug: (name) => name.toLowerCase(),
    }),
  }
}

describe('create listing use case', () => {
  it('creates a valid listing and returns a mapped CreateListingResponse', () => {
    const { useCase } = createUseCase()

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
    const { useCase } = createUseCase()

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
    const { repository, useCase } = createUseCase()

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

  it('rejects image object keys outside the listing-images namespace', () => {
    const { useCase } = createUseCase()

    for (const badKey of ['image-1', 'report-photos/media-1.jpg', 'listing-images/../x.jpg']) {
      const result = useCase.execute({
        request: { ...validBirdRequest, imageObjectKeys: [badKey] },
        actorUserId: 'user-1',
        organization: null,
        tags: [],
      })

      expect(result.ok).toBe(false)
      if (result.ok === false) {
        expect(result.error.code).toBe('VALIDATION_ERROR')
      }
    }
  })

  it('rejects more than 6 listing images', () => {
    const { useCase } = createUseCase()

    const result = useCase.execute({
      request: {
        ...validBirdRequest,
        imageObjectKeys: Array.from({ length: 7 }, (_, index) => `listing-images/media-${index}.jpg`),
      },
      actorUserId: 'user-1',
      organization: null,
      tags: [],
    })

    expect(result.ok).toBe(false)
    if (result.ok === false) {
      expect(result.error.code).toBe('VALIDATION_ERROR')
      expect(result.error.message).toMatch(/6/)
    }
  })

  it('persists no write-time public url and serves images by derived url', () => {
    const { repository, useCase } = createUseCase()

    const result = useCase.execute({
      request: { ...validBirdRequest, organizationId: undefined },
      actorUserId: 'user-1',
      organization: null,
      tags: [],
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.listing.images[0].url).toBe('/media/listing-images/media-1.jpg')
    }
    expect(repository.getById('listing-new')?.images[0]?.publicUrl).toBe(null)
  })
})
