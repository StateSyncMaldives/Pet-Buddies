import { describe, expect, it } from 'vitest'
import { createAuth } from '../../../../src/server/auth/auth'
import { createTestDatabase } from '../../../helpers/test-database' // existing/derived D1 test helper

describe('createAuth', () => {
  it('builds an instance exposing a request handler and getSession api', async () => {
    const database = await createTestDatabase()
    const auth = createAuth({
      database,
      secrets: {
        BETTER_AUTH_SECRET: 'x'.repeat(32),
        BETTER_AUTH_URL: 'http://localhost',
        GOOGLE_CLIENT_ID: 'id',
        GOOGLE_CLIENT_SECRET: 'secret',
      },
    })
    expect(typeof auth.handler).toBe('function')
    expect(typeof auth.api.getSession).toBe('function')
  })
})
