import type { drizzle } from 'drizzle-orm/d1'

import {
  apiResultOk,
  type ApiResult,
  type ListSavedListingsResponse,
  type ToggleSavedListingResponse,
} from '../contracts/api'
import { toListingDetail } from '../domain/listings/listing-mapper'
import { createDrizzleListingRepository } from '../infra/repositories/drizzle-listing-repository'
import { createDrizzleSavedListingRepository } from '../infra/repositories/drizzle-saved-listing-repository'
import type * as schema from '../infra/db/schema'

type PetBuddiesDb = ReturnType<typeof drizzle<typeof schema>>

/**
 * Durable saved-listings capability, backed by D1 through the Drizzle
 * repositories. Returns the same ApiResult shapes as the in-memory backend so
 * loaders and the server-function write path can consume it unchanged. This is
 * the first capability of the durable async backend described in ADR 0008.
 */
export interface DurableSavedListingBackend {
  listSavedListings(input: { viewerId: string }): Promise<ApiResult<ListSavedListingsResponse>>
  toggleSavedListing(input: { listingId: string; viewerId: string }): Promise<ApiResult<ToggleSavedListingResponse>>
}

export function createDurableSavedListingBackend(input: { db: PetBuddiesDb }): DurableSavedListingBackend {
  const listingRepository = createDrizzleListingRepository({ db: input.db })
  const savedListingRepository = createDrizzleSavedListingRepository({ db: input.db, listingRepository })

  return {
    async listSavedListings({ viewerId }) {
      const aggregates = await savedListingRepository.listByViewer(viewerId)
      return apiResultOk({ items: aggregates.map(toListingDetail) })
    },
    async toggleSavedListing({ listingId, viewerId }) {
      const saved = await savedListingRepository.toggle({ viewerId, listingId })
      return apiResultOk({ listingId, saved })
    },
  }
}
