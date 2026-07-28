import { describe, expect, it } from 'vitest'

import {
  AuthzError,
  requireGlobalPermission,
  requireGlobalRole,
  requireOrgRole,
  requireViewer,
} from '../../../../src/server/auth/guards'
import type { Viewer } from '../../../../src/server/auth/resolve-viewer'
import * as schema from '../../../../src/server/infra/db/schema'
import { createTestDatabase } from '../../../helpers/test-database'

const anonymous: Viewer = { kind: 'anonymous' }
const user: Viewer = {
  kind: 'user',
  id: 'u1',
  email: 'u1@petbuddies.mv',
  displayName: 'User One',
  role: 'user',
  banned: false,
}
const moderator: Viewer = { ...user, role: 'moderator' }
const admin: Viewer = { ...user, role: 'admin' }
const banned: Viewer = { ...user, banned: true }

function codeOf(run: () => unknown): string | undefined {
  try {
    run()
    return undefined
  } catch (error) {
    return error instanceof AuthzError ? error.code : `unexpected: ${String(error)}`
  }
}

describe('requireViewer', () => {
  it('rejects an anonymous viewer with UNAUTHORIZED', () => {
    expect(() => requireViewer(anonymous)).toThrow(AuthzError)
    expect(codeOf(() => requireViewer(anonymous))).toBe('UNAUTHORIZED')
  })

  it('rejects a banned viewer with FORBIDDEN', () => {
    expect(codeOf(() => requireViewer(banned))).toBe('FORBIDDEN')
  })

  it('allows a signed-in viewer', () => {
    expect(() => requireViewer(user)).not.toThrow()
  })
})

describe('requireGlobalRole', () => {
  it('enforces the role ordering', () => {
    expect(codeOf(() => requireGlobalRole(user, 'moderator'))).toBe('FORBIDDEN')
    expect(() => requireGlobalRole(moderator, 'moderator')).not.toThrow()
    // Higher roles satisfy lower requirements.
    expect(() => requireGlobalRole(admin, 'moderator')).not.toThrow()
    expect(codeOf(() => requireGlobalRole(moderator, 'admin'))).toBe('FORBIDDEN')
  })

  it('rejects an anonymous viewer with UNAUTHORIZED, not FORBIDDEN', () => {
    expect(codeOf(() => requireGlobalRole(anonymous, 'admin'))).toBe('UNAUTHORIZED')
  })
})

describe('requireGlobalPermission', () => {
  it('allows a moderator to moderate listings and denies a plain user', () => {
    expect(() => requireGlobalPermission(moderator, 'listing', 'moderate')).not.toThrow()
    expect(codeOf(() => requireGlobalPermission(user, 'listing', 'moderate'))).toBe('FORBIDDEN')
  })

  it('reserves user and organization administration for admins', () => {
    expect(codeOf(() => requireGlobalPermission(moderator, 'user', 'setRole'))).toBe('FORBIDDEN')
    expect(codeOf(() => requireGlobalPermission(moderator, 'org', 'verify'))).toBe('FORBIDDEN')
    expect(() => requireGlobalPermission(admin, 'user', 'setRole')).not.toThrow()
    expect(() => requireGlobalPermission(admin, 'user', 'ban')).not.toThrow()
    expect(() => requireGlobalPermission(admin, 'org', 'verify')).not.toThrow()
  })

  it('rejects a banned admin with FORBIDDEN', () => {
    expect(codeOf(() => requireGlobalPermission({ ...admin, banned: true }, 'user', 'ban'))).toBe(
      'FORBIDDEN',
    )
  })
})

describe('requireOrgRole', () => {
  async function databaseWithMember(role: 'member' | 'listing_manager' | 'admin' | null) {
    const database = await createTestDatabase()
    await database
      .insert(schema.organizations)
      .values({ id: 'org-1', slug: 'org-1', name: 'Org One' })
      .run()
    await database
      .insert(schema.users)
      .values({ id: 'u1', email: 'u1@petbuddies.mv', displayName: 'User One' })
      .run()
    if (role) {
      await database
        .insert(schema.organizationMembers)
        .values({ organizationId: 'org-1', userId: 'u1', role })
        .run()
    }
    return database
  }

  it('rejects an anonymous viewer with UNAUTHORIZED', async () => {
    const database = await databaseWithMember('admin')
    await expect(requireOrgRole({ database }, anonymous, 'org-1', 'member')).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    })
  })

  it('rejects a viewer who is not a member', async () => {
    const database = await databaseWithMember(null)
    await expect(requireOrgRole({ database }, user, 'org-1', 'member')).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  })

  it('rejects a member whose org role is too low', async () => {
    const database = await databaseWithMember('member')
    await expect(
      requireOrgRole({ database }, user, 'org-1', 'listing_manager'),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('allows a listing manager to manage listings', async () => {
    const database = await databaseWithMember('listing_manager')
    await expect(requireOrgRole({ database }, user, 'org-1', 'listing_manager')).resolves.toBeUndefined()
  })

  it('allows an organization admin to satisfy a lower requirement', async () => {
    const database = await databaseWithMember('admin')
    await expect(requireOrgRole({ database }, user, 'org-1', 'listing_manager')).resolves.toBeUndefined()
  })

  it('rejects a banned viewer even when they are an organization admin', async () => {
    const database = await databaseWithMember('admin')
    await expect(requireOrgRole({ database }, banned, 'org-1', 'member')).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  })
})
