import type { CreateLostFoundReportRequest } from '../../contracts/api'
import type { CreateReportUseCase } from '../../domain/reports/create-report'

export function postReport(input: {
  request: CreateLostFoundReportRequest
  createReport: CreateReportUseCase
}) {
  return input.createReport.execute(input.request)
}
