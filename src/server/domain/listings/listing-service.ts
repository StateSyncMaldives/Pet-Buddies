import {
  apiResultErr,
  apiResultOk,
  type ApiResult,
  type BrowseListingsQuery,
  type BrowseListingsResponse,
  type GetListingDetailResponse,
} from '../../contracts/api'
import { toListingDetail, toListingSummary } from './listing-mapper'
import type { ListingRepository } from './listing-repository'

export interface ListingService {
  browseListings(query: BrowseListingsQuery): ApiResult<BrowseListingsResponse>
  getListingDetail(input: { slugOrId: string }): ApiResult<GetListingDetailResponse>
}

export function createListingService(input: { repository: ListingRepository }): ListingService {
  return {
    browseListings(query) {
      // Species, live-status, and tag-set membership are resolved by the
      // repository's browse (in SQL for the durable adapter). The service layers
      // the free-text search — its joined-haystack semantics (name, area, tag
      // slugs and labels) have no strict SQL equivalent. See #10.
      const normalizedSearch = query.search?.trim().toLowerCase()
      const aggregates = input.repository
        .browse(query)
        .filter((aggregate) => {
          if (!normalizedSearch) {
            return true
          }

          const haystack = [
            aggregate.listing.name,
            aggregate.listing.areaLabel,
            ...aggregate.tags.map((tag) => tag.slug),
            ...aggregate.tags.map((tag) => tag.label),
          ]
            .join(' ')
            .toLowerCase()

          return haystack.includes(normalizedSearch)
        })

      const items = aggregates.map(toListingSummary)
      const availableTags = uniqueTags(aggregates)

      return apiResultOk({
        items,
        pageInfo: {
          nextCursor: null,
        },
        availableTags,
      })
    },
    getListingDetail({ slugOrId }) {
      const aggregate = input.repository.getBySlug(slugOrId) ?? input.repository.getById(slugOrId)
      if (!aggregate) {
        return apiResultErr('NOT_FOUND', 'Listing not found.')
      }

      return apiResultOk({
        item: toListingDetail(aggregate),
      })
    },
  }
}

function uniqueTags(aggregates: ReturnType<ListingRepository['browse']>): BrowseListingsResponse['availableTags'] {
  const bySlug = new Map<string, BrowseListingsResponse['availableTags'][number]>()

  for (const aggregate of aggregates) {
    for (const tag of aggregate.tags) {
      bySlug.set(tag.slug, {
        slug: tag.slug,
        label: tag.label,
        speciesScope: tag.speciesScope,
      })
    }
  }

  return Array.from(bySlug.values())
}
