import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { createAuth } from '../../../../src/server/auth/auth'
import * as schema from '../../../../src/server/infra/db/schema'
import { createTestDatabase } from '../../../helpers/test-database' // existing/derived D1 test helper

function buildAuth(database: Awaited<ReturnType<typeof createTestDatabase>>) {
  return createAuth({
    database,
    secrets: {
      BETTER_AUTH_SECRET: 'x'.repeat(32),
      BETTER_AUTH_URL: 'http://localhost',
      GOOGLE_CLIENT_ID: 'id',
      GOOGLE_CLIENT_SECRET: 'secret',
    },
  })
}

describe('createAuth', () => {
  it('builds an instance exposing a request handler and getSession api', async () => {
    const database = await createTestDatabase()
    const auth = buildAuth(database)
    expect(typeof auth.handler).toBe('function')
    expect(typeof auth.api.getSession).toBe('function')
  })

  it('performs a real signup write against the migrated database', async () => {
    const database = await createTestDatabase()
    const auth = buildAuth(database)

    const email = 'new-user@example.com'
    const result = await auth.api.signUpEmail({
      body: { email, password: 'Sup3rSecurePassw0rd!', name: 'New User' },
    })

    expect(result.user).toBeTruthy()
    expect(result.user.email).toBe(email)

    const rows = await database.select().from(schema.users).where(eq(schema.users.email, email)).all()
    expect(rows).toHaveLength(1)
    expect(rows[0]?.displayName).toBe('New User')
  })
})
