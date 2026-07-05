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

  it('accepts a report photo key from the report-photos namespace', () => {
    const saveReport = vi.fn()
    const useCase = createCreateReportUseCase({
      now: () => '2026-07-02T08:00:00.000Z',
      generateId: () => 'report-2',
      generateReferenceCode: () => 'PB-5678',
      saveReport,
    })

    const result = useCase.execute({
      reportKind: 'lost',
      species: 'cat',
      areaLabel: 'Hulhumale',
      description: 'Grey tabby, red collar',
      photoObjectKey: 'report-photos/media-9.webp',
    })

    expect(result.ok).toBe(true)
    expect(saveReport).toHaveBeenCalledWith(
      expect.objectContaining({ photoObjectKey: 'report-photos/media-9.webp' }),
    )
  })

  it('rejects a photo key outside the report-photos namespace', () => {
    const saveReport = vi.fn()
    const useCase = createCreateReportUseCase({
      now: () => '2026-07-02T08:00:00.000Z',
      generateId: () => 'report-3',
      generateReferenceCode: () => 'PB-9999',
      saveReport,
    })

    for (const badKey of ['listing-images/media-1.jpg', 'seed/mango', 'photo-1']) {
      const result = useCase.execute({
        reportKind: 'lost',
        species: 'cat',
        areaLabel: 'Hulhumale',
        description: 'Grey tabby, red collar',
        photoObjectKey: badKey,
      })

      expect(result.ok).toBe(false)
      if (result.ok === false) {
        expect(result.error.code).toBe('VALIDATION_ERROR')
      }
    }

    expect(saveReport).not.toHaveBeenCalled()
  })
})
