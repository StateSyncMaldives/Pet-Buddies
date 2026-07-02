import { describe, expect, it } from 'vitest'

import { createModerateListingUseCase } from '../../../../../src/server/domain/listings/moderate-listing'
import { createInMemoryListingRepository } from '../../../../../src/server/domain/listings/listing-repository'
import type { ListingAggregate } from '../../../../../src/server/domain/listings/listing-mapper'
import type { ListingStatus } from '../../../../../src/server/contracts/api'
import type { ModerationEventRecord } from '../../../../../backend/contracts'

describe('moderate listing use case', () => {
  it('approves a pending listing and records a moderation event id', () => {
    const repository = createInMemoryListingRepository({
      listings: [createListingAggregate({ status: 'pending' })],
    })
    const moderationEvents: ModerationEventRecord[] = []
    const useCase = createModerateListingUseCase({
      repository,
      now: () => '2026-07-02T12:00:00.000Z',
      generateEventId: () => 'mod-event-1',
      saveModerationEvent: (event) => {
        moderationEvents.push(event)
      },
    })

    const result = useCase.execute({
      listingId: 'listing-1',
      actorUserId: 'moderator-1',
      request: { action: 'approved' },
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.moderationEventId).toBe('mod-event-1')
      expect(result.data.listing.status).toBe('live')
      expect(result.data.listing.publishedAt).toBe('2026-07-02T12:00:00.000Z')
    }

    expect(moderationEvents).toEqual([
      {
        id: 'mod-event-1',
        listingId: 'listing-1',
        actorUserId: 'moderator-1',
        action: 'approved',
        reason: null,
        metadataJson: null,
        createdAt: '2026-07-02T12:00:00.000Z',
      },
    ])
  })

  it('only allows approve or reject when the listing is pending', () => {
    const repository = createInMemoryListingRepository({
      listings: [createListingAggregate({ status: 'live' })],
    })
    const useCase = createModerateListingUseCase({
      repository,
      now: () => '2026-07-02T12:00:00.000Z',
      generateEventId: () => 'mod-event-1',
      saveModerationEvent: () => {},
    })

    const result = useCase.execute({
      listingId: 'listing-1',
      actorUserId: 'moderator-1',
      request: { action: 'rejected', reason: 'Duplicate listing' },
    })

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'CONFLICT',
        message: 'Only pending listings can be approved or rejected.',
      },
    })
  })

  it('only allows adoption when the listing is live', () => {
    const repository = createInMemoryListingRepository({
      listings: [createListingAggregate({ status: 'pending' })],
    })
    const useCase = createModerateListingUseCase({
      repository,
      now: () => '2026-07-02T12:00:00.000Z',
      generateEventId: () => 'mod-event-1',
      saveModerationEvent: () => {},
    })

    const result = useCase.execute({
      listingId: 'listing-1',
      actorUserId: 'moderator-1',
      request: { action: 'adopted' },
    })

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'CONFLICT',
        message: 'Only live listings can be marked as adopted.',
      },
    })
  })

  it('only allows restore from rejected or adopted back to live', () => {
    const repository = createInMemoryListingRepository({
      listings: [createListingAggregate({ status: 'pending' })],
    })
    const useCase = createModerateListingUseCase({
      repository,
      now: () => '2026-07-02T12:00:00.000Z',
      generateEventId: () => 'mod-event-1',
      saveModerationEvent: () => {},
    })

    const result = useCase.execute({
      listingId: 'listing-1',
      actorUserId: 'moderator-1',
      request: { action: 'restored' },
    })

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'CONFLICT',
        message: 'Only rejected or adopted listings can be restored.',
      },
    })
  })
})

function createListingAggregate(input: { status: ListingStatus }): ListingAggregate {
  return {
    listing: {
      id: 'listing-1',
      slug: 'mango',
      species: 'bird',
      birdSpecies: 'Cockatiel',
      name: 'Mango',
      ageText: '2 years',
      sex: 'female',
      areaLabel: 'Male',
      story: 'Gentle bird ready for adoption.',
      status: input.status,
      listedByUserId: null,
      organizationId: 'org-1',
      publishedAt: input.status === 'live' ? '2026-07-01T10:00:00.000Z' : null,
      adoptedAt: input.status === 'adopted' ? '2026-07-01T10:00:00.000Z' : null,
      rejectedAt: input.status === 'rejected' ? '2026-07-01T10:00:00.000Z' : null,
      rejectedReason: input.status === 'rejected' ? 'Needs review' : null,
      createdAt: '2026-07-01T09:00:00.000Z',
      updatedAt: '2026-07-01T09:00:00.000Z',
    },
    images: [
      {
        id: 'image-1',
        listingId: 'listing-1',
        objectKey: 'images/mango-1.jpg',
        publicUrl: 'https://cdn.example/images/mango-1.jpg',
        sortOrder: 0,
        width: 1200,
        height: 900,
        createdAt: '2026-07-01T09:00:00.000Z',
      },
    ],
    tags: [
      {
        id: 'tag-1',
        slug: 'hand-tame',
        label: 'Hand tame',
        speciesScope: 'bird',
        createdAt: '2026-07-01T09:00:00.000Z',
      },
    ],
    organization: {
      id: 'org-1',
      slug: 'feather-friends',
      name: 'Feather Friends',
      kind: 'rescue',
      description: 'Bird rescue',
      areaLabel: 'Male',
      contactEmail: 'hello@feather.example',
      contactPhone: '+9607000000',
      isVerified: true,
      verifiedAt: '2026-06-30T09:00:00.000Z',
      createdAt: '2026-06-30T09:00:00.000Z',
      updatedAt: '2026-06-30T09:00:00.000Z',
    },
    listedByUser: null,
    savedByViewer: false,
  }
}
