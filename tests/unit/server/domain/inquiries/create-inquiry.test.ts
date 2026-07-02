import { describe, expect, it, vi } from 'vitest'

import { createCreateInquiryUseCase } from '../../../../../src/server/domain/inquiries/create-inquiry'
import type { ListingAggregate } from '../../../../../src/server/domain/listings/listing-mapper'
import { createInMemoryListingRepository } from '../../../../../src/server/domain/listings/listing-repository'

const liveOrganizationListing: ListingAggregate = {
  listing: {
    id: 'listing-1',
    slug: 'mango',
    species: 'bird',
    birdSpecies: 'Cockatiel',
    name: 'Mango',
    ageText: '2 years',
    sex: 'female',
    areaLabel: 'Male',
    story: 'Sweet rescue bird',
    status: 'live',
    listedByUserId: null,
    organizationId: 'org-1',
    publishedAt: '2026-07-02T08:00:00.000Z',
    adoptedAt: null,
    rejectedAt: null,
    rejectedReason: null,
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-07-02T08:00:00.000Z',
  },
  images: [],
  tags: [],
  organization: {
    id: 'org-1',
    slug: 'feather-friends',
    name: 'Feather Friends',
    kind: 'rescue',
    description: null,
    areaLabel: 'Male',
    contactEmail: null,
    contactPhone: null,
    isVerified: true,
    verifiedAt: '2026-06-01T08:00:00.000Z',
    createdAt: '2026-06-01T08:00:00.000Z',
    updatedAt: '2026-06-01T08:00:00.000Z',
  },
  listedByUser: null,
  savedByViewer: false,
}

describe('create inquiry', () => {
  it('cannot inquire on non-live listings', () => {
    const repository = createInMemoryListingRepository({
      listings: [{ ...liveOrganizationListing, listing: { ...liveOrganizationListing.listing, status: 'pending' } }],
    })
    const useCase = createCreateInquiryUseCase({
      repository,
      now: () => '2026-07-02T08:00:00.000Z',
      generateId: () => 'inq-1',
      saveInquiry: vi.fn(),
    })

    expect(useCase.execute({ listingId: 'listing-1', message: 'Hi', senderUserId: 'viewer-1' })).toEqual({
      ok: false,
      error: {
        code: 'CONFLICT',
        message: 'Only live listings can receive adoption inquiries.',
      },
    })
  })

  it('snapshots recipient display data and returns only the intended transport shape', () => {
    const saveInquiry = vi.fn()
    const repository = createInMemoryListingRepository({ listings: [liveOrganizationListing] })
    const useCase = createCreateInquiryUseCase({
      repository,
      now: () => '2026-07-02T08:00:00.000Z',
      generateId: () => 'inq-1',
      saveInquiry,
    })

    const result = useCase.execute({
      listingId: 'listing-1',
      message: 'I would love to adopt Mango.',
      senderUserId: 'viewer-1',
    })

    expect(saveInquiry).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientDisplayNameSnapshot: 'Feather Friends',
        listingNameSnapshot: 'Mango',
      }),
    )

    expect(result).toEqual({
      ok: true,
      data: {
        inquiry: {
          id: 'inq-1',
          listingId: 'listing-1',
          status: 'awaiting_reply',
          createdAt: '2026-07-02T08:00:00.000Z',
        },
      },
    })
  })
})
