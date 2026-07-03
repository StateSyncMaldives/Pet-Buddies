import { z } from 'zod'

const speciesSchema = z.enum(['cat', 'bird'])
const birdSpeciesSchema = z.enum(['Budgerigar', 'Cockatiel', 'Lovebird', 'Finch', 'Canary'])
const sexSchema = z.enum(['male', 'female', 'unknown'])
const reportKindSchema = z.enum(['lost', 'found'])
const listingLifecycleActionSchema = z.enum(['approved', 'rejected', 'adopted', 'restored'])

export const toggleSavedListingInputSchema = z.object({
  listingId: z.string().min(1),
})

export const createInquiryInputSchema = z.object({
  request: z.object({
    listingId: z.string().min(1),
    message: z.string().trim().min(1),
  }),
})

export const createListingInputSchema = z.object({
  actorUserId: z.string().min(1).nullable(),
  request: z.object({
    species: speciesSchema,
    birdSpecies: birdSpeciesSchema.optional(),
    name: z.string().trim().min(1),
    ageText: z.string().trim().min(1),
    sex: sexSchema.optional(),
    areaLabel: z.string().trim().min(1),
    story: z.string().trim(),
    tagIds: z.array(z.string().min(1)),
    imageObjectKeys: z.array(z.string().min(1)),
    organizationId: z.string().min(1).optional(),
  }),
})

export const createReportInputSchema = z.object({
  request: z.object({
    reportKind: reportKindSchema,
    species: speciesSchema,
    birdSpecies: birdSpeciesSchema.optional(),
    reporterName: z.string().trim().min(1).optional(),
    reporterEmail: z.string().trim().email().optional(),
    areaLabel: z.string().trim().min(1),
    description: z.string().trim().min(1),
    photoObjectKey: z.string().min(1).optional(),
  }),
})

export const updateListingLifecycleInputSchema = z.object({
  listingId: z.string().min(1),
  actorUserId: z.string().min(1),
  request: z.object({
    action: listingLifecycleActionSchema,
    reason: z.string().trim().min(1).optional(),
  }),
})

export type ToggleSavedListingMutationInput = z.infer<typeof toggleSavedListingInputSchema>
export type CreateInquiryMutationInput = z.infer<typeof createInquiryInputSchema>
export type CreateListingMutationInput = z.infer<typeof createListingInputSchema>
export type CreateReportMutationInput = z.infer<typeof createReportInputSchema>
export type UpdateListingLifecycleMutationInput = z.infer<typeof updateListingLifecycleInputSchema>
