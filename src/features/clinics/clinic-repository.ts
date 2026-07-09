import { SEED_CLINICS } from '../../data/seed'
import type { ClinicRecord } from '../../../backend/contracts'

export interface ClinicSeedRecord extends ClinicRecord {
  services: string[]
}

export interface ClinicRepository {
  list(): ClinicSeedRecord[]
}

export function createSeedClinicRepository(): ClinicRepository {
  const clinics: ClinicSeedRecord[] = SEED_CLINICS.map((clinic) => ({
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
    }))

  return {
    list() {
      return clinics.map((clinic) => ({ ...clinic, services: [...clinic.services] }))
    },
  }
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
