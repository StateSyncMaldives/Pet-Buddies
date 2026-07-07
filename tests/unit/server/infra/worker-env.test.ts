import { describe, expect, it } from 'vitest'

import { getWorkerEnv } from '../../../../src/server/infra/cloudflare/worker-env'

describe('worker env', () => {
  it('returns null outside workerd where cloudflare:workers cannot be imported', async () => {
    await expect(getWorkerEnv()).resolves.toBeNull()
  })
})
