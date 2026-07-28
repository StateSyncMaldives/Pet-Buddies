// @vitest-environment node
//
// The session helpers read `set-cookie` off a same-process `auth.handler()`
// response. happy-dom (the project default) enforces the browser rule that JS
// can't read that header, so this file needs real Node fetch semantics — same
// reason as tests/unit/server/auth/auth-route.test.ts.
import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'

import { createAuth } from '../../../../src/server/auth/auth'
import { seedAuth } from '../../../../src/server/auth/seed-auth'
import * as schema from '../../../../src/server/infra/db/schema'
import { createTestSession } from '../../../helpers/auth'
import { createTestDatabase } from '../../../helpers/test-database'

const secrets = {
  BETTER_AUTH_SECRET: 'x'.repeat(32),
  BETTER_AUTH_URL: 'http://localhost',
  GOOGLE_CLIENT_ID: 'id',
  GOOGLE_CLIENT_SECRET: 'secret',
}

async function buildAuth() {
  const database = await createTestDatabase()
  return { database, auth: createAuth({ database, secrets }) }
}

describe('seedAuth', () => {
  it('creates a single admin user with a credential account and the admin role', async () => {
    const { database, auth } = await buildAuth()

    await seedAuth({ auth, database })

    const admins = await database.select().from(schema.users).where(eq(schema.users.role, 'admin')).all()
    expect(admins).toHaveLength(1)

    const accounts = await database
      .select()
      .from(schema.account)
      .where(eq(schema.account.userId, admins[0]!.id))
      .all()
    expect(accounts.some((account) => account.providerId === 'credential')).toBe(true)
  })

  it('seeds a moderator alongside the administrator', async () => {
    const { database, auth } = await buildAuth()

    const { adminUserId, moderatorUserId } = await seedAuth({ auth, database })

    expect(adminUserId).not.toBe(moderatorUserId)
    const moderators = await database
      .select()
      .from(schema.users)
      .where(eq(schema.users.role, 'moderator'))
      .all()
    expect(moderators.map((user) => user.id)).toEqual([moderatorUserId])
  })

  it('is idempotent', async () => {
    const { database, auth } = await buildAuth()

    const first = await seedAuth({ auth, database })
    const second = await seedAuth({ auth, database })

    expect(second).toEqual(first)
    const admins = await database.select().from(schema.users).where(eq(schema.users.role, 'admin')).all()
    expect(admins).toHaveLength(1)
    const allUsers = await database.select().from(schema.users).all()
    expect(allUsers).toHaveLength(2)
  })
})

describe('createTestSession', () => {
  it.each(['user', 'moderator', 'admin'] as const)('mints a usable %s session cookie', async (role) => {
    const { database, auth } = await buildAuth()

    const cookie = await createTestSession(auth, database, role)
    const session = await auth.api.getSession({ headers: new Headers({ cookie }) })

    expect(session?.user).toBeTruthy()
    expect((session!.user as { role?: string }).role).toBe(role)
  })
})
