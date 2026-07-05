import type { LostFoundReportRecord } from '../../../../backend/contracts'
import type { ApiResult, CreateLostFoundReportRequest, CreateLostFoundReportResponse } from '../../contracts/api'
import { isAdmissibleMediaObjectKey } from '../media/media-object-keys'
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
        return {
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'The report photo is not a valid uploaded report photo.',
          },
        }
      }

      const routing = routeLostFoundReport({
        species: request.species,
        reportKind: request.reportKind,
        birdSpecies: request.birdSpecies,
      })

      if (routing.ok === false) {
        return {
          ok: false,
          error: routing.error,
        }
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

      return {
        ok: true,
        data: {
          report: {
            id,
            referenceCode,
            routedToOrganizationId: routing.value.routedToOrganizationId,
            status: 'submitted',
            createdAt,
          },
        },
      }
    },
  }
}
