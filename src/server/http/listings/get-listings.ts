import type { BrowseListingsQuery } from '../../contracts/api'
import type { ListingService } from '../../domain/listings/listing-service'

export function getListings(input: {
  query: BrowseListingsQuery
  listingService: ListingService
}) {
  return input.listingService.browseListings(input.query)
}
