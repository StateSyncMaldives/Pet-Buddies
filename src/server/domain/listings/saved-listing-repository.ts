import type { ListingAggregate } from './listing-mapper'
import type { AsyncListingRepository, ToggleSavedListingInput } from './listing-repository'

export interface AsyncSavedListingRepository {
  listByViewer(viewerId: string): Promise<ListingAggregate[]>
  toggle(input: ToggleSavedListingInput): Promise<boolean>
}

export function createAsyncSavedListingRepositoryFromListingRepository(
  listingRepository: AsyncListingRepository,
): AsyncSavedListingRepository {
  return {
    async listByViewer(viewerId) {
      return (await listingRepository.listAll(viewerId)).filter((aggregate) => aggregate.savedByViewer)
    },
    toggle(input) {
      return listingRepository.toggleSavedListing(input)
    },
  }
}
