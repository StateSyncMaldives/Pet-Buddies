import { eq } from 'drizzle-orm'
import type { drizzle } from 'drizzle-orm/d1'

import type { ModerationEventRecord } from '../../../../backend/contracts'
import type { AsyncModerationEventRepository } from '../../domain/listings/moderation-event-repository'
import * as schema from '../db/schema'

type PetBuddiesDb = ReturnType<typeof drizzle<typeof schema>>

export function createDrizzleModerationEventRepository(input: {
  db: PetBuddiesDb
}): AsyncModerationEventRepository {
  const db = input.db

  return {
    async save(event) {
      await db
        .insert(schema.moderationEvents)
        .values(toModerationEventInsert(event))
        .onConflictDoUpdate({
          target: schema.moderationEvents.id,
          set: toModerationEventInsert(event),
        })
        .run()

      return { ...event }
    },
    async listByListing(listingId) {
      const rows = await db
        .select()
        .from(schema.moderationEvents)
        .where(eq(schema.moderationEvents.listingId, listingId))
        .all()

      return rows
        .map(toModerationEventRecord)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    },
  }
}

function toModerationEventRecord(row: typeof schema.moderationEvents.$inferSelect): ModerationEventRecord {
  return {
    id: row.id,
    listingId: row.listingId,
    actorUserId: row.actorUserId,
    action: row.action,
    reason: row.reason,
    metadataJson: row.metadataJson,
    createdAt: row.createdAt,
  }
}

function toModerationEventInsert(record: ModerationEventRecord): typeof schema.moderationEvents.$inferInsert {
  return {
    id: record.id,
    listingId: record.listingId,
    actorUserId: record.actorUserId,
    action: record.action,
    reason: record.reason,
    metadataJson: record.metadataJson,
    createdAt: record.createdAt,
  }
}
