// @vitest-environment node
import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'

import { createAuth } from '../../../../src/server/auth/auth'
import {
  BOOTSTRAP_ACCOUNTS,
  resolveBootstrapAccounts,
  seedAuth,
} from '../../../../src/server/auth/seed-auth'
import { seedDurableStore } from '../../../../src/server/infra/db/seed-durable-store'
import * as schema from '../../../../src/server/infra/db/schema'
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

/**
 * The committed BOOTSTRAP_ACCOUNTS passwords are public, so an environment that
 * has not been configured must end up with NO administrator — never one anybody
 * reading the repo could sign in as.
 */
describe('resolveBootstrapAccounts', () => {
  it('returns nothing when the environment is unconfigured', () => {
    expect(resolveBootstrapAccounts(undefined)).toBeNull()
    expect(resolveBootstrapAccounts(null)).toBeNull()
    expect(resolveBootstrapAccounts({})).toBeNull()
  })

  it('returns nothing when only one half of the credential is present', () => {
    expect(resolveBootstrapAccounts({ BOOTSTRAP_ADMIN_EMAIL: 'a@b.com' })).toBeNull()
    expect(resolveBootstrapAccounts({ BOOTSTRAP_ADMIN_PASSWORD: 'hunter2hunter2' })).toBeNull()
    expect(
      resolveBootstrapAccounts({ BOOTSTRAP_ADMIN_EMAIL: '   ', BOOTSTRAP_ADMIN_PASSWORD: 'hunter2hunter2' }),
    ).toBeNull()
  })

  it('never falls back to the committed default credentials', () => {
    const accounts = resolveBootstrapAccounts({
      BOOTSTRAP_ADMIN_EMAIL: 'ops@petbuddies.mv',
      BOOTSTRAP_ADMIN_PASSWORD: 'a-real-operator-secret',
    })

    expect(accounts).toEqual([
      expect.objectContaining({ email: 'ops@petbuddies.mv', role: 'admin' }),
    ])
    expect(accounts?.some((a) => a.password === BOOTSTRAP_ACCOUNTS.admin.password)).toBe(false)
  })

  it('adds a moderator only when both of its credentials are given', () => {
    const base = {
      BOOTSTRAP_ADMIN_EMAIL: 'ops@petbuddies.mv',
      BOOTSTRAP_ADMIN_PASSWORD: 'a-real-operator-secret',
    }
    expect(resolveBootstrapAccounts({ ...base, BOOTSTRAP_MODERATOR_EMAIL: 'mod@x.mv' })).toHaveLength(1)

    const withModerator = resolveBootstrapAccounts({
      ...base,
      BOOTSTRAP_MODERATOR_EMAIL: 'mod@x.mv',
      BOOTSTRAP_MODERATOR_PASSWORD: 'another-secret',
    })
    expect(withModerator?.map((a) => a.role)).toEqual(['admin', 'moderator'])
  })
})

describe('seedDurableStore bootstrap wiring', () => {
  it('creates no account at all when bootstrapAccounts is null', async () => {
    const { database, auth } = await buildAuth()

    await seedDurableStore({ db: database, auth, bootstrapAccounts: null })

    const privileged = await database
      .select()
      .from(schema.users)
      .where(eq(schema.users.role, 'admin'))
      .all()
    expect(privileged).toHaveLength(0)
    // The listing seed still runs — only the account seeding is skipped.
    expect((await database.select().from(schema.listings).all()).length).toBeGreaterThan(0)
  }, 30_000)

  it('creates the operator-supplied administrator, signable-in with that password', async () => {
    const { database, auth } = await buildAuth()
    const accounts = resolveBootstrapAccounts({
      BOOTSTRAP_ADMIN_EMAIL: 'ops@petbuddies.mv',
      BOOTSTRAP_ADMIN_PASSWORD: 'a-real-operator-secret',
    })

    await seedDurableStore({ db: database, auth, bootstrapAccounts: accounts })

    const admins = await database.select().from(schema.users).where(eq(schema.users.role, 'admin')).all()
    expect(admins.map((user) => user.email)).toEqual(['ops@petbuddies.mv'])

    const response = await auth.handler(
      new Request('http://localhost/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'ops@petbuddies.mv', password: 'a-real-operator-secret' }),
      }),
    )
    expect(response.headers.get('set-cookie')).toContain('better-auth')
  }, 30_000)

  it('is idempotent across repeated seeds', async () => {
    const { database, auth } = await buildAuth()
    const accounts = resolveBootstrapAccounts({
      BOOTSTRAP_ADMIN_EMAIL: 'ops@petbuddies.mv',
      BOOTSTRAP_ADMIN_PASSWORD: 'a-real-operator-secret',
    })

    await seedDurableStore({ db: database, auth, bootstrapAccounts: accounts })
    await seedDurableStore({ db: database, auth, bootstrapAccounts: accounts })

    const admins = await database.select().from(schema.users).where(eq(schema.users.role, 'admin')).all()
    expect(admins).toHaveLength(1)
  }, 30_000)

  it('seeds an explicit account list through seedAuth', async () => {
    const { database, auth } = await buildAuth()

    const result = await seedAuth({
      auth,
      database,
      accounts: [
        { email: 'ops@petbuddies.mv', password: 'a-real-operator-secret', name: 'Ops', role: 'admin' },
        { email: 'mod@petbuddies.mv', password: 'another-real-secret', name: 'Mod', role: 'moderator' },
      ],
    })

    expect(result.userIds).toHaveLength(2)
    const moderator = await database
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, 'mod@petbuddies.mv'))
      .get()
    expect(moderator?.role).toBe('moderator')
    expect(result.moderatorUserId).toBe(moderator?.id)
  }, 30_000)
})
