import type { ApiResult, ListClinicsResponse } from '../../contracts/api'
import type { ClinicRepository } from './clinic-repository'

export interface ClinicService {
  listClinics(): ApiResult<ListClinicsResponse>
}

export function createClinicService(input: { repository: ClinicRepository }): ClinicService {
  return {
    listClinics() {
      return {
        ok: true,
        data: {
          items: input.repository.list().map((clinic) => ({
            id: clinic.id,
            slug: clinic.slug,
            name: clinic.name,
            areaLabel: clinic.areaLabel,
            phone: clinic.phone,
            note: clinic.note,
            mapsUrl: clinic.mapsUrl,
            services: [...clinic.services],
          })),
        },
      }
    },
  }
}
