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
import { createInMemoryAsyncBackend } from '../../../../src/server/runtime/app-backend'
import { createPrototypeBackend } from '../../../../src/server/runtime/prototype-backend'
import { JPEG_BYTES } from '../../../helpers/media-fixtures'

describe('app mutation adapter', () => {
  it('toggles a Saved listing through the injected runtime adapter', async () => {
    const backend = createPrototypeBackend()
    const mutations = createRuntimeMutationAdapter({
      backend: createInMemoryAsyncBackend(backend),
      viewerId: 'viewer-test',
      moderatorId: 'moderator-test',
    })

    const result = await mutations.toggleSavedListing({ listingId: 'mishka' })

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

  it('submits an Adoption inquiry through the injected runtime adapter', async () => {
    const mutations = createRuntimeMutationAdapter({
      backend: createInMemoryAsyncBackend(createPrototypeBackend()),
      viewerId: 'viewer-test',
      moderatorId: 'moderator-test',
    })

    const result = await mutations.createInquiry({
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

  it('creates a Listing through the injected runtime adapter', async () => {
    const backend = createPrototypeBackend()
    const mutations = createRuntimeMutationAdapter({
      backend: createInMemoryAsyncBackend(backend),
      viewerId: 'viewer-test',
      moderatorId: 'moderator-test',
    })

    const result = await mutations.createListing({
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

  it('submits a Lost/found report through the injected runtime adapter', async () => {
    const mutations = createRuntimeMutationAdapter({
      backend: createInMemoryAsyncBackend(createPrototypeBackend()),
      viewerId: 'viewer-test',
      moderatorId: 'moderator-test',
    })

    const result = await mutations.createReport({
      request: {
        reportKind: 'found',
        species: 'bird',
        birdSpecies: 'Budgerigar',
        areaLabel: 'Maafannu, Male',
        description: 'Found a tame budgie near the harbour.',
        photoObjectKey: 'report-photos/demo-upload.jpg',
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

  it('uploads media through the injected runtime adapter', async () => {
    const mutations = createRuntimeMutationAdapter({
      backend: createInMemoryAsyncBackend(createPrototypeBackend()),
      viewerId: 'viewer-test',
      moderatorId: 'moderator-test',
    })

    const result = await mutations.uploadMedia({
      kind: 'report-photo',
      contentType: 'image/jpeg',
      sizeBytes: JPEG_BYTES.byteLength,
      bytes: JPEG_BYTES,
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.objectKey).toMatch(/^report-photos\/media-[a-z0-9-]+\.jpg$/)
      expect(result.data.url).toBe(`/media/${result.data.objectKey}`)
    }
  })

  it('applies a Listing lifecycle action through the injected runtime adapter', async () => {
    const mutations = createRuntimeMutationAdapter({
      backend: createInMemoryAsyncBackend(createPrototypeBackend()),
      viewerId: 'viewer-test',
      moderatorId: 'moderator-test',
    })

    const result = await mutations.updateListingLifecycle({
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
