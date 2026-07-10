import type { LostFoundReportRecord } from '../../../backend/contracts'
import {
  apiResultErr,
  apiResultOk,
  type ApiResult,
  type CreateLostFoundReportRequest,
  type CreateLostFoundReportResponse,
} from '../../server/contracts/api'
import { isAdmissibleMediaObjectKey } from '../../server/domain/media/media-object-keys'
import { routeLostFoundReport } from './report-routing'

export interface CreateReportUseCase {
  execute(input: CreateLostFoundReportRequest): ApiResult<CreateLostFoundReportResponse>
}

export function createCreateReportUseCase(input: {
  now: () => string
  generateId: () => string
  generateReferenceCode: () => string
  saveReport: (report: LostFoundReportRecord) => void
}): CreateReportUseCase {
  return {
    execute(request) {
      if (request.photoObjectKey != null && !isAdmissibleMediaObjectKey('report-photo', request.photoObjectKey)) {
        return apiResultErr('VALIDATION_ERROR', 'The report photo is not a valid uploaded report photo.')
      }

      const routing = routeLostFoundReport({
        species: request.species,
        reportKind: request.reportKind,
        birdSpecies: request.birdSpecies,
      })

      if (routing.ok === false) {
        return apiResultErr(routing.error.code, routing.error.message)
      }

      const createdAt = input.now()
      const id = input.generateId()
      const referenceCode = input.generateReferenceCode()

      input.saveReport({
        id,
        referenceCode,
        reportKind: request.reportKind,
        species: request.species,
        birdSpecies: request.birdSpecies ?? null,
        reporterUserId: null,
        reporterName: request.reporterName ?? null,
        reporterEmail: request.reporterEmail ?? null,
        areaLabel: request.areaLabel,
        description: request.description,
        photoObjectKey: request.photoObjectKey ?? null,
        routedToOrganizationId: routing.value.routedToOrganizationId,
        status: 'submitted',
        createdAt,
        updatedAt: createdAt,
      })

      return apiResultOk<CreateLostFoundReportResponse>({
        report: {
          id,
          referenceCode,
          routedToOrganizationId: routing.value.routedToOrganizationId,
          status: 'submitted',
          createdAt,
        },
      })
    },
  }
}
