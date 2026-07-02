import type { UpdateListingModerationRequest } from '../../contracts/api'
import type { ModerateListingUseCase } from '../../domain/listings/moderate-listing'

export function postListingAction(input: {
  listingId: string
  actorUserId: string
  request: UpdateListingModerationRequest
  moderateListing: ModerateListingUseCase
}) {
  return input.moderateListing.execute({
    listingId: input.listingId,
    actorUserId: input.actorUserId,
    request: input.request,
  })
}
