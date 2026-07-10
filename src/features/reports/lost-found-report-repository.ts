import type { LostFoundReportRecord } from '../../../backend/contracts'

export interface AsyncLostFoundReportRepository {
  save(report: LostFoundReportRecord): Promise<LostFoundReportRecord>
  getByReferenceCode(referenceCode: string): Promise<LostFoundReportRecord | null>
  listByRoutedOrganization(input: {
    routedToOrganizationId: string
    status?: LostFoundReportRecord['status']
  }): Promise<LostFoundReportRecord[]>
}

export function createInMemoryAsyncLostFoundReportRepository(input: {
  reports?: LostFoundReportRecord[]
} = {}): AsyncLostFoundReportRepository {
  const reports = new Map<string, LostFoundReportRecord>()

  for (const report of input.reports ?? []) {
    reports.set(report.id, { ...report })
  }

  return {
    async save(report) {
      reports.set(report.id, { ...report })
      return { ...report }
    },
    async getByReferenceCode(referenceCode) {
      const report = Array.from(reports.values()).find((item) => item.referenceCode === referenceCode)
      return report ? { ...report } : null
    },
    async listByRoutedOrganization(input) {
      return Array.from(reports.values())
        .filter((report) => report.routedToOrganizationId === input.routedToOrganizationId)
        .filter((report) => (input.status ? report.status === input.status : true))
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .map((report) => ({ ...report }))
    },
  }
}
