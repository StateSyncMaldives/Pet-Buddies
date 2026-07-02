import { describe, expect, it, vi } from 'vitest'

import { postReport } from '../../../../../src/server/http/reports/post-report'

describe('post report handler', () => {
  it('keeps routing rules out of the handler and delegates to the report use case', () => {
    const execute = vi.fn().mockReturnValue({
      ok: true,
      data: {
        report: {
          id: 'report-1',
          referenceCode: 'PB-1234',
          routedToOrganizationId: 'org-cat-rescue',
          status: 'submitted',
          createdAt: '2026-07-02T08:00:00.000Z',
        },
      },
    })

    const request = {
      reportKind: 'lost' as const,
      species: 'cat' as const,
      areaLabel: 'Male',
      description: 'Missing near the market',
    }

    const result = postReport({ request, createReport: { execute } })

    expect(execute).toHaveBeenCalledWith(request)
    expect(result.ok).toBe(true)
  })
})
