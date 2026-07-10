import { describe, expect, it } from 'vitest'

import { createSeedClinicRepository } from '../../../../../src/features/clinics/clinic-repository'
import { createClinicService } from '../../../../../src/features/clinics/clinic-service'

describe('clinic service', () => {
  it('maps the hardcoded seed clinics into the public response contract', () => {
    const repository = createSeedClinicRepository()
    const service = createClinicService({ repository })

    const result = service.listClinics()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.items).toEqual([
        expect.objectContaining({
          id: 'clinic-oases-vet-hospital',
          slug: 'oases-vet-hospital',
          name: 'Oases Vet Hospital',
          areaLabel: 'Abadhah Fehi Magu, Malé',
          services: ['Surgery', 'Diagnostics', 'Grooming', 'Pet shop'],
        }),
        expect.objectContaining({
          id: 'clinic-erika-vet-hospital',
          slug: 'erika-vet-hospital',
          name: 'Erika Vet Hospital',
        }),
      ])
    }
  })
})
