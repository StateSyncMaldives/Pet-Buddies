import { describe, expect, expectTypeOf, it } from 'vitest'

import {
  API_RESULT_READY,
  apiResultOk,
  type ApiResult,
  type BrowseListingsResponse,
  type BrowseListingsQuery,
  type CreateInquiryRequest,
  type CreateListingRequest,
  type CreateLostFoundReportRequest,
  type GetListingDetailResponse,
  type GetYouReadModelResponse,
  type ListClinicsResponse,
  type ListSavedListingsResponse,
  type ToggleSavedListingResponse,
  type UpdateListingModerationRequest,
} from '../../../../src/server/contracts/api'

describe('server api transport contracts', () => {
  it('exports transport request and response shapes that typecheck with representative samples', () => {
    const browseQuery: BrowseListingsQuery = {
      species: 'bird',
      tagSlugs: ['playful'],
      areaLabel: 'Male',
      search: 'coco',
      cursor: 'cursor-1',
      limit: 12,
    }

    const createListingRequest: CreateListingRequest = {
      species: 'bird',
      birdSpecies: 'Cockatiel',
      name: 'Coco',
      ageText: '2 years',
      sex: 'female',
      areaLabel: 'Male',
      story: 'Friendly rescue bird',
      tagIds: ['tag-1'],
      imageObjectKeys: ['image-1'],
      organizationId: 'org-1',
    }

    const moderationRequest: UpdateListingModerationRequest = {
      action: 'approved',
      reason: 'Looks good',
    }

    const inquiryRequest: CreateInquiryRequest = {
      listingId: 'listing-1',
      message: 'I would love to adopt Coco.',
    }

    const lostFoundRequest: CreateLostFoundReportRequest = {
      reportKind: 'lost',
      species: 'cat',
      areaLabel: 'Hulhumalé',
      description: 'Last seen near the marina',
      reporterName: 'Aisha',
      reporterEmail: 'aisha@example.com',
    }

    const browseResponse: BrowseListingsResponse = {
      items: [
        {
          id: 'listing-1',
          slug: 'coco',
          species: 'bird',
          birdSpecies: 'Cockatiel',
          name: 'Coco',
          ageText: '2 years',
          sex: 'female',
          areaLabel: 'Male',
          status: 'live',
          primaryImageUrl: 'https://example.com/coco.jpg',
          tags: ['playful'],
          organization: {
            id: 'org-1',
            slug: 'feather-friends',
            name: 'Feather Friends',
            kind: 'rescue',
            areaLabel: 'Male',
            isVerified: true,
          },
          savedByViewer: false,
          publishedAt: '2026-07-02T08:00:00.000Z',
        },
      ],
      pageInfo: {
        nextCursor: null,
      },
      availableTags: [
        {
          slug: 'playful',
          label: 'Playful',
          speciesScope: 'both',
        },
      ],
    }

    const detailResponse: GetListingDetailResponse = {
      item: {
        ...browseResponse.items[0],
        story: 'Friendly rescue bird',
        images: [
          {
            id: 'image-1',
            url: 'https://example.com/coco.jpg',
            width: 1200,
            height: 800,
            sortOrder: 0,
          },
        ],
        listedBy: {
          kind: 'organization',
          id: 'org-1',
          displayName: 'Feather Friends',
        },
        inquiryAllowed: true,
      },
    }

    const clinicsResponse: ListClinicsResponse = {
      items: [
        {
          id: 'clinic-1',
          slug: 'island-vet',
          name: 'Island Vet',
          areaLabel: 'Male',
          phone: '+9600000000',
          note: 'Open daily',
          mapsUrl: 'https://maps.example/1',
          services: ['Checkups'],
        },
      ],
    }

    const savedListingsResponse: ListSavedListingsResponse = {
      items: [detailResponse.item],
    }

    const youReadModelResponse: GetYouReadModelResponse = {
      sentAdoptionInquiries: [
        {
          id: 'inquiry-1',
          listingId: 'listing-1',
          listingName: 'Coco',
          recipientDisplayName: 'Feather Friends',
          message: 'I would love to adopt Coco.',
          status: 'awaiting_reply',
          createdAt: '2026-07-02T08:00:00.000Z',
        },
      ],
      ownedListings: [detailResponse.item],
    }

    const toggleSavedResponse: ToggleSavedListingResponse = {
      listingId: 'listing-1',
      saved: true,
    }

    const result = apiResultOk(browseResponse)

    expect(API_RESULT_READY).toBe('server-contracts-ready')
    expect(browseQuery.limit).toBe(12)
    expect('createdAt' in createListingRequest).toBe(false)
    expect('updatedAt' in moderationRequest).toBe(false)
    expect(inquiryRequest.message).toContain('adopt')
    expect(lostFoundRequest.reportKind).toBe('lost')
    expect('objectKey' in detailResponse.item.images[0]).toBe(false)
    expect(toggleSavedResponse.saved).toBe(true)
    expect(clinicsResponse.items).toHaveLength(1)
    expect(savedListingsResponse.items[0].savedByViewer).toBe(false)
    expect(youReadModelResponse.sentAdoptionInquiries[0].recipientDisplayName).toBe('Feather Friends')

    expectTypeOf(result).toEqualTypeOf<ApiResult<BrowseListingsResponse>>()
    expectTypeOf(savedListingsResponse).toEqualTypeOf<ListSavedListingsResponse>()
    expectTypeOf(youReadModelResponse).toEqualTypeOf<GetYouReadModelResponse>()
  })
})
