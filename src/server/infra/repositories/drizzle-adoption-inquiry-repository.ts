import { eq } from 'drizzle-orm'
import type { drizzle } from 'drizzle-orm/d1'

import type { AdoptionInquiryRecord } from '../../../../backend/contracts'
import type { AsyncAdoptionInquiryRepository } from '../../domain/inquiries/adoption-inquiry-repository'
import * as schema from '../db/schema'

type PetBuddiesDb = ReturnType<typeof drizzle<typeof schema>>

export function createDrizzleAdoptionInquiryRepository(input: {
  db: PetBuddiesDb
}): AsyncAdoptionInquiryRepository {
  const db = input.db

  return {
    async save(inquiry) {
      await db
        .insert(schema.adoptionInquiries)
        .values(toInquiryInsert(inquiry))
        .onConflictDoUpdate({
          target: schema.adoptionInquiries.id,
          set: toInquiryInsert(inquiry),
        })
        .run()

      return { ...inquiry }
    },
    async listSentBySender(senderUserId) {
      const rows = await db
        .select()
        .from(schema.adoptionInquiries)
        .where(eq(schema.adoptionInquiries.senderUserId, senderUserId))
        .all()

      return rows
        .map(toInquiryRecord)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    },
  }
}

function toInquiryRecord(row: typeof schema.adoptionInquiries.$inferSelect): AdoptionInquiryRecord {
  return {
    id: row.id,
    listingId: row.listingId,
    senderUserId: row.senderUserId,
    recipientUserId: row.recipientUserId,
    recipientOrganizationId: row.recipientOrganizationId,
    recipientDisplayNameSnapshot: row.recipientDisplayNameSnapshot,
    listingNameSnapshot: row.listingNameSnapshot,
    message: row.message,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toInquiryInsert(record: AdoptionInquiryRecord): typeof schema.adoptionInquiries.$inferInsert {
  return {
    id: record.id,
    listingId: record.listingId,
    senderUserId: record.senderUserId,
    recipientUserId: record.recipientUserId,
    recipientOrganizationId: record.recipientOrganizationId,
    recipientDisplayNameSnapshot: record.recipientDisplayNameSnapshot,
    listingNameSnapshot: record.listingNameSnapshot,
    message: record.message,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}
