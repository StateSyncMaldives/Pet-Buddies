import { and, eq } from 'drizzle-orm'
import type { drizzle } from 'drizzle-orm/d1'

import type {
  AsyncSavedListingRepository,
} from '../../domain/listings/saved-listing-repository'
import type { AsyncListingRepository, ToggleSavedListingInput } from '../../domain/listings/listing-repository'
import * as schema from '../db/schema'

type PetBuddiesDb = ReturnType<typeof drizzle<typeof schema>>

export function createDrizzleSavedListingRepository(input: {
  db: PetBuddiesDb
  listingRepository: Pick<AsyncListingRepository, 'getById'>
}): AsyncSavedListingRepository {
  const db = input.db

  return {
    async listByViewer(viewerId) {
      const rows = await db
        .select()
        .from(schema.savedListings)
        .where(eq(schema.savedListings.userId, viewerId))
        .all()
      const aggregates = await Promise.all(rows.map((row) => input.listingRepository.getById(row.listingId)))

      return aggregates
        .filter((aggregate) => aggregate !== null)
        .map((aggregate) => ({
          ...aggregate,
          savedByViewer: true,
        }))
    },
    async toggle(input: ToggleSavedListingInput) {
      const existing = await db
        .select()
        .from(schema.savedListings)
        .where(and(eq(schema.savedListings.userId, input.viewerId), eq(schema.savedListings.listingId, input.listingId)))
        .all()

      if (existing.length > 0) {
        await db
          .delete(schema.savedListings)
          .where(and(eq(schema.savedListings.userId, input.viewerId), eq(schema.savedListings.listingId, input.listingId)))
          .run()
        return false
      }

      await db
        .insert(schema.savedListings)
        .values({
          userId: input.viewerId,
          listingId: input.listingId,
        })
        .run()
      return true
    },
  }
}
