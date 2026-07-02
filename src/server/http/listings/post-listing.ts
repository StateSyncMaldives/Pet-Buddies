import type { OrganizationSummary } from '../../contracts/api'
import type { TagRecord } from '../../../../backend/contracts'
import type { CreateListingInput, CreateListingUseCase } from '../../domain/listings/create-listing'

export function postListing(input: CreateListingInput & { createListing: CreateListingUseCase }) {
  return input.createListing.execute({
    request: input.request,
    actorUserId: input.actorUserId,
    organization: input.organization,
    tags: input.tags,
  })
}

export type { OrganizationSummary, TagRecord }
