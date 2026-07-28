// @vitest-environment node
//
// Mints real session cookies through `auth.handler()`; happy-dom hides
// `set-cookie` from JS. See tests/unit/server/auth/auth-route.test.ts.
import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'

import {
  banUserForAdmin,
  listUsersForAdmin,
  setUserRoleForAdmin,
  unbanUserForAdmin,
} from '../../../../src/features/auth/admin.functions'
import * as schema from '../../../../src/server/infra/db/schema'
import { runWithSession, type ServerFnHarness } from '../../../helpers/run-server-fn'

async function idOfRole(harness: ServerFnHarness, role: 'user' | 'moderator' | 'admin') {
  const row = await harness.database
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.role, role))
    .get()
  if (!row) throw new Error(`no seeded ${role}`)
  return row.id
}

describe('listUsers', () => {
  it('rejects an anonymous caller with UNAUTHORIZED', async () => {
    await runWithSession('anonymous', async ({ viewer, database }) => {
      await expect(listUsersForAdmin({ viewer, database })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      })
    })
  }, 20_000)

  it('rejects a moderator with FORBIDDEN', async () => {
    await runWithSession('moderator', async ({ viewer, database }) => {
      await expect(listUsersForAdmin({ viewer, database })).rejects.toMatchObject({
        code: 'FORBIDDEN',
      })
    })
  }, 20_000)

  it('lists users for an administrator', async () => {
    await runWithSession('admin', async ({ viewer, database }) => {
      const { items } = await listUsersForAdmin({ viewer, database })

      expect(items.some((item) => item.role === 'admin')).toBe(true)
      expect(items.some((item) => item.role === 'moderator')).toBe(true)
    })
  }, 20_000)
})

describe('setUserRole', () => {
  it('rejects a moderator with FORBIDDEN', async () => {
    await runWithSession('moderator', async (harness) => {
      const targetId = await idOfRole(harness, 'admin')

      await expect(
        setUserRoleForAdmin(
          { viewer: harness.viewer, database: harness.database },
          { userId: targetId, role: 'user' },
        ),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' })
    })
  }, 20_000)

  it('lets an administrator promote a plain user to moderator', async () => {
    await runWithSession('admin', async (harness) => {
      const targetId = await idOfRole(harness, 'user')

      const { user } = await setUserRoleForAdmin(
        { viewer: harness.viewer, database: harness.database },
        { userId: targetId, role: 'moderator' },
      )

      expect(user).toMatchObject({ id: targetId, role: 'moderator' })
    })
  }, 20_000)

  it('blocks demoting the last administrator with CONFLICT', async () => {
    await runWithSession('admin', async (harness) => {
      const adminId = await idOfRole(harness, 'admin')

      await expect(
        setUserRoleForAdmin(
          { viewer: harness.viewer, database: harness.database },
          { userId: adminId, role: 'user' },
        ),
      ).rejects.toMatchObject({ code: 'CONFLICT' })
    })
  }, 20_000)

  it('allows demoting an administrator once another one exists', async () => {
    await runWithSession('admin', async (harness) => {
      const deps = { viewer: harness.viewer, database: harness.database }
      const firstAdminId = await idOfRole(harness, 'admin')
      const secondAdminId = await idOfRole(harness, 'moderator')
      await setUserRoleForAdmin(deps, { userId: secondAdminId, role: 'admin' })

      const { user } = await setUserRoleForAdmin(deps, { userId: firstAdminId, role: 'user' })

      expect(user.role).toBe('user')
    })
  }, 20_000)
})

describe('banUser / unbanUser', () => {
  it('rejects a moderator with FORBIDDEN', async () => {
    await runWithSession('moderator', async (harness) => {
      const targetId = await idOfRole(harness, 'user')

      await expect(
        banUserForAdmin({ viewer: harness.viewer, database: harness.database }, { userId: targetId }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' })
    })
  }, 20_000)

  it('bans and then unbans a user for an administrator', async () => {
    await runWithSession('admin', async (harness) => {
      const deps = { viewer: harness.viewer, database: harness.database }
      const targetId = await idOfRole(harness, 'user')

      const banned = await banUserForAdmin(deps, { userId: targetId, reason: 'Spam listings' })
      expect(banned.user).toMatchObject({ banned: true, banReason: 'Spam listings' })

      const restored = await unbanUserForAdmin(deps, { userId: targetId })
      expect(restored.user).toMatchObject({ banned: false, banReason: null })
    })
  }, 20_000)

  it('refuses to let an administrator ban themselves', async () => {
    await runWithSession('admin', async (harness) => {
      if (harness.viewer.kind !== 'user') throw new Error('expected a signed-in viewer')

      await expect(
        banUserForAdmin(
          { viewer: harness.viewer, database: harness.database },
          { userId: harness.viewer.id },
        ),
      ).rejects.toMatchObject({ code: 'CONFLICT' })
    })
  }, 20_000)
})
