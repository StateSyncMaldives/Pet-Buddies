import { eq } from 'drizzle-orm'
import type { drizzle } from 'drizzle-orm/d1'

import type { ClinicRecord } from '../../../../backend/contracts'
import { SEED_CLINICS } from '../../../data/seed'
import * as schema from '../db/schema'

type PetBuddiesDb = ReturnType<typeof drizzle<typeof schema>>
export interface ClinicRecordWithServices extends ClinicRecord {
  services: string[]
}

export function createDrizzleClinicRepository(input: { db: PetBuddiesDb }) {
  const db = input.db

  return {
    async list(): Promise<ClinicRecordWithServices[]> {
      const rows = await db.select().from(schema.clinics).where(eq(schema.clinics.isActive, true)).all()
      const result: ClinicRecordWithServices[] = []

      for (const row of rows) {
        const services = await db
          .select({ serviceName: schema.clinicServices.serviceName })
          .from(schema.clinicServices)
          .where(eq(schema.clinicServices.clinicId, row.id))
          .all()

        result.push({
          ...toClinicRecord(row),
          services: services.map((service) => service.serviceName),
        })
      }

      return result
    },
  }
}

export async function seedClinicRecords(db: PetBuddiesDb): Promise<void> {
  for (const clinic of SEED_CLINICS.map(seedClinicToRecord)) {
    await db
      .insert(schema.clinics)
      .values(toClinicInsert(clinic))
      .onConflictDoNothing()
      .run()

    for (const serviceName of clinic.services) {
      await db
        .insert(schema.clinicServices)
        .values({ clinicId: clinic.id, serviceName })
        .onConflictDoNothing()
        .run()
    }
  }
}

function seedClinicToRecord(clinic: (typeof SEED_CLINICS)[number]): ClinicRecordWithServices {
  return {
    id: `clinic-${slugify(clinic.name)}`,
    slug: slugify(clinic.name),
    name: clinic.name,
    areaLabel: clinic.area,
    address: clinic.area,
    phone: null,
    note: clinic.note,
    mapsUrl: null,
    isActive: true,
    services: [...clinic.services],
    createdAt: '2026-07-02T08:00:00.000Z',
    updatedAt: '2026-07-02T08:00:00.000Z',
  }
}

function toClinicRecord(row: typeof schema.clinics.$inferSelect): ClinicRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    areaLabel: row.areaLabel,
    address: row.address,
    phone: row.phone,
    note: row.note,
    mapsUrl: row.mapsUrl,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toClinicInsert(record: ClinicRecord): typeof schema.clinics.$inferInsert {
  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
    areaLabel: record.areaLabel,
    address: record.address,
    phone: record.phone,
    note: record.note,
    mapsUrl: record.mapsUrl,
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
