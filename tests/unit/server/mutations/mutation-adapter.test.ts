import { describe, expect, expectTypeOf, it } from 'vitest'

import type {
  ApiResult,
  CreateInquiryResponse,
  CreateListingResponse,
  CreateLostFoundReportResponse,
  ToggleSavedListingResponse,
  UpdateListingModerationResponse,
} from '../../../../src/server/contracts/api'
import { createRuntimeMutationAdapter, type AppMutationAdapter } from '../../../../src/server/mutations/mutation-adapter'
import { createPrototypeBackend } from '../../../../src/server/runtime/prototype-backend'

describe('app mutation adapter', () => {
  it('toggles a Saved listing through the injected runtime adapter', () => {
    const backend = createPrototypeBackend()
    const mutations = createRuntimeMutationAdapter({
      backend,
      viewerId: 'viewer-test',
      moderatorId: 'moderator-test',
    })

    const result = mutations.toggleSavedListing({ listingId: 'mishka' })

    expect(result).toEqual({
      ok: true,
      data: {
        listingId: 'mishka',
        saved: true,
      },
    })
    expect(backend.hydrateAppShell({ viewerId: 'viewer-test' }).listings.find((listing) => listing.id === 'mishka')?.savedByViewer).toBe(true)
    expectTypeOf(result).toEqualTypeOf<ApiResult<ToggleSavedListingResponse>>()
    expectTypeOf(mutations).toEqualTypeOf<AppMutationAdapter>()
  })

  it('submits an Adoption inquiry through the injected runtime adapter', () => {
    const mutations = createRuntimeMutationAdapter({
      backend: createPrototypeBackend(),
      viewerId: 'viewer-test',
      moderatorId: 'moderator-test',
    })

    const result = mutations.createInquiry({
      request: {
        listingId: 'mishka',
        message: 'Could we arrange a visit this weekend?',
      },
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.inquiry).toMatchObject({
        listingId: 'mishka',
        status: 'awaiting_reply',
      })
    }
    expectTypeOf(result).toEqualTypeOf<ApiResult<CreateInquiryResponse>>()
  })

  it('creates a Listing through the injected runtime adapter', () => {
    const backend = createPrototypeBackend()
    const mutations = createRuntimeMutationAdapter({
      backend,
      viewerId: 'viewer-test',
      moderatorId: 'moderator-test',
    })

    const result = mutations.createListing({
      actorUserId: 'viewer-test',
      request: {
        species: 'bird',
        birdSpecies: 'Cockatiel',
        name: 'Sunny',
        ageText: '10 months',
        sex: 'unknown',
        areaLabel: 'Hulhumale',
        story: 'Friendly bird ready for a new home.',
        tagIds: [backend.getTagId('Hand-tame')],
        imageObjectKeys: [],
      },
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.listing).toMatchObject({
        name: 'Sunny',
        species: 'bird',
        status: 'pending',
      })
    }
    expectTypeOf(result).toEqualTypeOf<ApiResult<CreateListingResponse>>()
  })

  it('submits a Lost/found report through the injected runtime adapter', () => {
    const mutations = createRuntimeMutationAdapter({
      backend: createPrototypeBackend(),
      viewerId: 'viewer-test',
      moderatorId: 'moderator-test',
    })

    const result = mutations.createReport({
      request: {
        reportKind: 'found',
        species: 'bird',
        birdSpecies: 'Budgerigar',
        areaLabel: 'Maafannu, Male',
        description: 'Found a tame budgie near the harbour.',
        photoObjectKey: 'report-photo/demo-upload.jpg',
      },
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.report).toMatchObject({
        routedToOrganizationId: 'org-bird-rescue',
        status: 'submitted',
      })
      expect(result.data.report.referenceCode).toMatch(/^MV\d+$/)
    }
    expectTypeOf(result).toEqualTypeOf<ApiResult<CreateLostFoundReportResponse>>()
  })

  it('applies a Listing lifecycle action through the injected runtime adapter', () => {
    const mutations = createRuntimeMutationAdapter({
      backend: createPrototypeBackend(),
      viewerId: 'viewer-test',
      moderatorId: 'moderator-test',
    })

    const result = mutations.updateListingLifecycle({
      listingId: 'pending-simba',
      actorUserId: 'moderator-test',
      request: {
        action: 'approved',
      },
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.listing).toMatchObject({
        id: 'pending-simba',
        status: 'live',
      })
      expect(result.data.moderationEventId).toMatch(/^mod-event-/)
    }
    expectTypeOf(result).toEqualTypeOf<ApiResult<UpdateListingModerationResponse>>()
  })
})
