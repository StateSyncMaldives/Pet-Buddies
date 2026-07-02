import type { ToggleSavedListingUseCase } from '../../domain/listings/toggle-saved-listing'

export function postSaveListing(input: {
  params: { listingId: string }
  viewerId: string
  toggleSavedListing: ToggleSavedListingUseCase
}) {
  return input.toggleSavedListing.execute({
    listingId: input.params.listingId,
    viewerId: input.viewerId,
  })
}
