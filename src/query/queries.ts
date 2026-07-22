import { queryOptions } from '@tanstack/react-query'

import { fetchClinics } from '../features/clinics/clinics.functions'
import { getBrowseListings, fetchListingDetail } from '../features/listings/listings.functions'
import { fetchReviewQueue } from '../features/moderation/moderation.functions'
import { fetchYouReadModel } from '../features/profile/profile.functions'
import { fetchSavedListings } from '../features/saved/saved.functions'
import type { ApiResult, Species } from '../server/contracts/api'
import type { AsyncAppBackend } from '../server/runtime/app-backend'

// Runtime reads go through the server functions; tests inject an in-memory
// backend via the router context and the query uses it directly (mirrors the
// route loaders' `context.backend ? … : serverFn()` seam).
async function unwrap<T>(result: Promise<ApiResult<T>>): Promise<T> {
  const resolved = await result
  if (!resolved.ok) throw new Error(resolved.error.message)
  return resolved.data
}

/**
 * The single client cache for durable reads (ADR 0009). Query keys are the
 * shared keying scheme: route loaders prefetch these with
 * queryClient.ensureQueryData; route components and overlays read them with
 * useQuery; writes invalidate the affected keys. There is no second client-side
 * mirror of server data.
 */

export interface BrowseQueryInput {
  species: Species
  query: string
  tags: string[]
}

export const queryKeys = {
  reviewQueue: ['review-queue'] as const,
  browse: (input: BrowseQueryInput) => ['browse', input] as const,
  saved: ['saved-listings'] as const,
  you: ['you-read-model'] as const,
  clinics: ['clinics'] as const,
  listingDetail: (slugOrId: string) => ['listing-detail', slugOrId] as const,
}

export const reviewQueueQuery = (backend?: AsyncAppBackend) =>
  queryOptions({
    queryKey: queryKeys.reviewQueue,
    queryFn: () => (backend ? unwrap(backend.listReviewQueue()) : fetchReviewQueue()),
  })

export const browseQuery = (input: BrowseQueryInput) =>
  queryOptions({ queryKey: queryKeys.browse(input), queryFn: () => getBrowseListings({ data: input }) })

export const savedListingsQuery = () =>
  queryOptions({ queryKey: queryKeys.saved, queryFn: () => fetchSavedListings() })

export const youReadModelQuery = () =>
  queryOptions({ queryKey: queryKeys.you, queryFn: () => fetchYouReadModel() })

export const clinicsQuery = () =>
  queryOptions({ queryKey: queryKeys.clinics, queryFn: () => fetchClinics() })

export const listingDetailQuery = (slugOrId: string) =>
  queryOptions({ queryKey: queryKeys.listingDetail(slugOrId), queryFn: () => fetchListingDetail({ data: slugOrId }) })
