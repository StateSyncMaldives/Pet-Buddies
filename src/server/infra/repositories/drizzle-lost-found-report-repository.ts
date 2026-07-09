import { and, eq } from 'drizzle-orm'
import type { drizzle } from 'drizzle-orm/d1'

import type { LostFoundReportRecord } from '../../../../backend/contracts'
import type { AsyncLostFoundReportRepository } from '../../../features/reports/lost-found-report-repository'
import * as schema from '../db/schema'

type PetBuddiesDb = ReturnType<typeof drizzle<typeof schema>>

export function createDrizzleLostFoundReportRepository(input: {
  db: PetBuddiesDb
}): AsyncLostFoundReportRepository {
  const db = input.db

  return {
    async save(report) {
      await db
        .insert(schema.lostFoundReports)
        .values(toReportInsert(report))
        .onConflictDoUpdate({
          target: schema.lostFoundReports.id,
          set: toReportInsert(report),
        })
        .run()

      return { ...report }
    },
    async getByReferenceCode(referenceCode) {
      const rows = await db
        .select()
        .from(schema.lostFoundReports)
        .where(eq(schema.lostFoundReports.referenceCode, referenceCode))
        .all()

      return rows[0] ? toReportRecord(rows[0]) : null
    },
    async listByRoutedOrganization(input) {
      const where = input.status
        ? and(
            eq(schema.lostFoundReports.routedToOrganizationId, input.routedToOrganizationId),
            eq(schema.lostFoundReports.status, input.status),
          )
        : eq(schema.lostFoundReports.routedToOrganizationId, input.routedToOrganizationId)

      const rows = await db.select().from(schema.lostFoundReports).where(where).all()

      return rows
        .map(toReportRecord)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    },
  }
}

function toReportRecord(row: typeof schema.lostFoundReports.$inferSelect): LostFoundReportRecord {
  return {
    id: row.id,
    referenceCode: row.referenceCode,
    reportKind: row.reportKind,
    species: row.species,
    birdSpecies: row.birdSpecies,
    reporterUserId: row.reporterUserId,
    reporterName: row.reporterName,
    reporterEmail: row.reporterEmail,
    areaLabel: row.areaLabel,
    description: row.description,
    photoObjectKey: row.photoObjectKey,
    routedToOrganizationId: row.routedToOrganizationId,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toReportInsert(record: LostFoundReportRecord): typeof schema.lostFoundReports.$inferInsert {
  return {
    id: record.id,
    referenceCode: record.referenceCode,
    reportKind: record.reportKind,
    species: record.species,
    birdSpecies: record.birdSpecies,
    reporterUserId: record.reporterUserId,
    reporterName: record.reporterName,
    reporterEmail: record.reporterEmail,
    areaLabel: record.areaLabel,
    description: record.description,
    photoObjectKey: record.photoObjectKey,
    routedToOrganizationId: record.routedToOrganizationId,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}
