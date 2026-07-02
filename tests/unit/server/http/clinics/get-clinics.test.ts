import { describe, expect, it, vi } from 'vitest'

import { getClinics } from '../../../../../src/server/http/clinics/get-clinics'

describe('get clinics handler', () => {
  it('stays thin and delegates clinic listing to the service layer', () => {
    const listClinics = vi.fn().mockReturnValue({ ok: true, data: { items: [] } })

    const result = getClinics({
      clinicService: { listClinics },
    })

    expect(listClinics).toHaveBeenCalledTimes(1)
    expect(result.ok).toBe(true)
  })
})
