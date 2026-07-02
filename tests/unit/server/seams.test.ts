import { describe, expect, it } from 'vitest'

import { API_RESULT_READY, apiResultOk } from '../../../src/server/contracts/api'

describe('server seam imports', () => {
  it('exposes a minimal server contract seam', () => {
    expect(API_RESULT_READY).toBe('server-contracts-ready')
    expect(apiResultOk({ status: 'ok' })).toEqual({
      ok: true,
      data: { status: 'ok' },
    })
  })
})
