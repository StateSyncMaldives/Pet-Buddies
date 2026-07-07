import { apiResultOk, type ApiResult, type ToggleSavedListingResponse } from '../../contracts/api'
import type { ListingRepository } from './listing-repository'

export interface ToggleSavedListingUseCase {
  execute(input: { listingId: string; viewerId: string }): ApiResult<ToggleSavedListingResponse>
}

export function createToggleSavedListingUseCase(input: {
  repository: ListingRepository
}): ToggleSavedListingUseCase {
  return {
    execute({ listingId, viewerId }) {
      const saved = input.repository.toggleSavedListing({ listingId, viewerId })
      return apiResultOk({
        listingId,
        saved,
      })
    },
  }
}
