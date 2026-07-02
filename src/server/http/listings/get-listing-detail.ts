import type { ListingService } from '../../domain/listings/listing-service'

export function getListingDetail(input: {
  params: { slugOrId: string }
  listingService: ListingService
}) {
  return input.listingService.getListingDetail({ slugOrId: input.params.slugOrId })
}
