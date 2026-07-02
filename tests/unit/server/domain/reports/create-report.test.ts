import { describe, expect, it, vi } from 'vitest'

import { createCreateReportUseCase } from '../../../../../src/server/domain/reports/create-report'

describe('create report', () => {
  it('returns the report transport shape with reference code and routed organization id', () => {
    const saveReport = vi.fn()
    const useCase = createCreateReportUseCase({
      now: () => '2026-07-02T08:00:00.000Z',
      generateId: () => 'report-1',
      generateReferenceCode: () => 'PB-1234',
      saveReport,
    })

    const result = useCase.execute({
      reportKind: 'found',
      species: 'bird',
      birdSpecies: 'Cockatiel',
      areaLabel: 'Male',
      description: 'Found near the jetty',
      reporterName: 'Aisha',
      reporterEmail: 'aisha@example.com',
    })

    expect(saveReport).toHaveBeenCalledWith(
      expect.objectContaining({
        referenceCode: 'PB-1234',
        routedToOrganizationId: 'org-bird-rescue',
      }),
    )
    expect(result).toEqual({
      ok: true,
      data: {
        report: {
          id: 'report-1',
          referenceCode: 'PB-1234',
          routedToOrganizationId: 'org-bird-rescue',
          status: 'submitted',
          createdAt: '2026-07-02T08:00:00.000Z',
        },
      },
    })
  })
})
