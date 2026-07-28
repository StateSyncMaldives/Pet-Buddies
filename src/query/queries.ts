import { queryOptions } from '@tanstack/react-query'

import { listOrganizations, listUsers } from '../features/auth/admin.functions'
import { fetchClinics } from '../features/clinics/clinics.functions'
import { getBrowseListings, fetchListingDetail } from '../features/listings/listings.functions'
import { fetchReviewQueue } from '../features/moderation/moderation.functions'
import { fetchYouReadModel } from '../features/profile/profile.functions'
import { fetchSavedListings } from '../features/saved/saved.functions'
import { toTagSlug } from '../router/browse-search'
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
  adminUsers: ['admin-users'] as const,
  adminOrganizations: ['admin-organizations'] as const,
}

// The admin reads have no injected-backend seam: they query the database
// directly rather than going through AsyncAppBackend, and they are guarded
// server-side. Tests stub the server-function module instead.
export const adminUsersQuery = () =>
  queryOptions({ queryKey: queryKeys.adminUsers, queryFn: () => listUsers() })

export const adminOrganizationsQuery = () =>
  queryOptions({ queryKey: queryKeys.adminOrganizations, queryFn: () => listOrganizations() })

export const reviewQueueQuery = (backend?: AsyncAppBackend) =>
  queryOptions({
    queryKey: queryKeys.reviewQueue,
    queryFn: () => (backend ? unwrap(backend.listReviewQueue()) : fetchReviewQueue()),
  })

export const browseQuery = (backend: AsyncAppBackend | undefined, input: BrowseQueryInput) =>
  queryOptions({
    queryKey: queryKeys.browse(input),
    queryFn: () =>
      backend
        ? unwrap(
            backend.browseListings({
              query: { species: input.species, search: input.query || undefined, tagSlugs: input.tags.map(toTagSlug) },
            }),
          )
        : getBrowseListings({ data: input }),
  })

// When a backend is injected (tests, local harnesses) these mirror what the
// server handlers do: an anonymous viewer reads empty rather than falling
// through to the server function, which only runs inside the Start runtime.
export const savedListingsQuery = (backend?: AsyncAppBackend, viewerId?: string) =>
  queryOptions({
    queryKey: queryKeys.saved,
    queryFn: () => {
      if (!backend) return fetchSavedListings()
      if (!viewerId) return Promise.resolve({ items: [] })
      return unwrap(backend.listSavedListings({ viewerId }))
    },
  })

export const youReadModelQuery = (backend?: AsyncAppBackend, viewerId?: string) =>
  queryOptions({
    queryKey: queryKeys.you,
    queryFn: () => {
      if (!backend) return fetchYouReadModel()
      if (!viewerId) return Promise.resolve({ sentAdoptionInquiries: [], ownedListings: [] })
      return unwrap(backend.getYouReadModel({ viewerId }))
    },
  })

export const clinicsQuery = (backend?: AsyncAppBackend) =>
  queryOptions({
    queryKey: queryKeys.clinics,
    queryFn: () => (backend ? unwrap(backend.listClinics()) : fetchClinics()),
  })

export const listingDetailQuery = (backend: AsyncAppBackend | undefined, slugOrId: string) =>
  queryOptions({
    queryKey: queryKeys.listingDetail(slugOrId),
    queryFn: () => (backend ? unwrap(backend.getListingDetail({ slugOrId })) : fetchListingDetail({ data: slugOrId })),
  })
