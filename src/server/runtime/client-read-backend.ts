import {
  apiResultErr,
  apiResultOk,
  type BrowseListingsResponse,
  type GetListingDetailResponse,
  type GetYouReadModelResponse,
  type ListClinicsResponse,
  type ListSavedListingsResponse,
  type Species,
} from '../contracts/api'
import { createInMemoryAsyncBackend, type AsyncAppBackend } from './app-backend'
import { createPrototypeBackend, type HydratedAppShell } from './prototype-backend'

/** The read server functions (from the feature .functions.ts files) the proxy calls. */
export interface ServerFnReads {
  getBrowseListings: (options: { data: { species: Species; query: string; tags: string[] } }) => Promise<BrowseListingsResponse>
  fetchListingDetail: (options: { data: string }) => Promise<GetListingDetailResponse>
  fetchSavedListings: () => Promise<ListSavedListingsResponse>
  fetchYouReadModel: () => Promise<GetYouReadModelResponse>
  fetchClinics: () => Promise<ListClinicsResponse>
  fetchAppShell: () => Promise<HydratedAppShell>
}

/**
 * The client-side read backend for the SPA: route loaders run in the browser,
 * which cannot reach D1, so their reads are proxied through server functions
 * that resolve the durable backend on the server. Writes and other methods are
 * unused by loaders (the store owns writes via the server-function mutation
 * adapter); they delegate to an in-memory backend, which also backs the read
 * methods if a server function is unreachable. See ADR 0008.
 */
export function createServerFnReadBackend(reads: ServerFnReads): AsyncAppBackend {
  const fallback = createInMemoryAsyncBackend(createPrototypeBackend())

  return {
    ...fallback,
    async hydrateAppShell(input) {
      try {
        return await reads.fetchAppShell()
      } catch {
        return fallback.hydrateAppShell(input)
      }
    },
    async browseListings(input) {
      try {
        return apiResultOk(
          await reads.getBrowseListings({
            data: {
              species: input.query.species ?? 'cat',
              query: input.query.search ?? '',
              tags: input.query.tagSlugs ?? [],
            },
          }),
        )
      } catch {
        return fallback.browseListings(input)
      }
    },
    async getListingDetail(input) {
      try {
        return apiResultOk(await reads.fetchListingDetail({ data: input.slugOrId }))
      } catch {
        return apiResultErr('NOT_FOUND', 'Listing not found.')
      }
    },
    async listSavedListings(input) {
      try {
        return apiResultOk(await reads.fetchSavedListings())
      } catch {
        return fallback.listSavedListings(input)
      }
    },
    async getYouReadModel(input) {
      try {
        return apiResultOk(await reads.fetchYouReadModel())
      } catch {
        return fallback.getYouReadModel(input)
      }
    },
    async listClinics() {
      try {
        return apiResultOk(await reads.fetchClinics())
      } catch {
        return fallback.listClinics()
      }
    },
  }
}
