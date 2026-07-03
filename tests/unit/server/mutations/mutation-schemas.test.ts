import { describe, expect, expectTypeOf, it } from 'vitest'

import type {
  CreateInquiryRequest,
  CreateListingRequest,
  CreateLostFoundReportRequest,
  UpdateListingModerationRequest,
} from '../../../../src/server/contracts/api'
import {
  createInquiryInputSchema,
  createListingInputSchema,
  createReportInputSchema,
  toggleSavedListingInputSchema,
  type CreateInquiryMutationInput,
  type CreateListingMutationInput,
  type CreateReportMutationInput,
  type UpdateListingLifecycleMutationInput,
  updateListingLifecycleInputSchema,
} from '../../../../src/server/mutations/mutation-schemas'

describe('mutation input schemas', () => {
  it('validates and normalizes Adoption inquiry input', () => {
    const result = createInquiryInputSchema.safeParse({
      request: {
        listingId: 'mishka',
        message: '  Could we arrange a visit this weekend?  ',
      },
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.request.message).toBe('Could we arrange a visit this weekend?')
    }
    expectTypeOf<CreateInquiryMutationInput['request']>().toEqualTypeOf<CreateInquiryRequest>()
  })

  it('rejects invalid mutation inputs with field-level issues', () => {
    const result = createReportInputSchema.safeParse({
      request: {
        reportKind: 'found',
        species: 'bird',
        reporterEmail: 'not-an-email',
        areaLabel: '',
        description: '',
      },
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.request).toBeDefined()
    }
  })

  it('keeps inferred mutation inputs assignable to existing contract request shapes', () => {
    expect(toggleSavedListingInputSchema.parse({ listingId: 'mishka' })).toEqual({ listingId: 'mishka' })
    expectTypeOf<CreateListingMutationInput['request']>().toEqualTypeOf<CreateListingRequest>()
    expectTypeOf<CreateReportMutationInput['request']>().toEqualTypeOf<CreateLostFoundReportRequest>()
    expectTypeOf<UpdateListingLifecycleMutationInput['request']>().toEqualTypeOf<UpdateListingModerationRequest>()
    expect(updateListingLifecycleInputSchema.parse({ listingId: 'pending-simba', actorUserId: 'moderator-test', request: { action: 'approved' } }).request.action).toBe('approved')
    expect(createListingInputSchema.parse({
      actorUserId: null,
      request: {
        species: 'cat',
        name: 'Milo',
        ageText: '2 years',
        areaLabel: 'Male',
        story: 'Calm cat',
        tagIds: [],
        imageObjectKeys: [],
      },
    }).request.name).toBe('Milo')
  })
})
