import { createServerFn } from '@tanstack/react-start'
import { and, eq, ne } from 'drizzle-orm'
import { z } from 'zod'

import { AuthzError } from '../../server/auth/authz-error'
import { requireGlobalPermission } from '../../server/auth/guards'
import { resolveRequestViewer } from '../../server/auth/request-viewer'
import type { Viewer } from '../../server/auth/resolve-viewer'
import type { GlobalRole } from '../../server/contracts/api'
import type { PetBuddiesDrizzleDatabase } from '../../server/infra/db/d1-drizzle'
import { resolveRequestDatabase } from '../../server/infra/db/request-database'
import * as schema from '../../server/infra/db/schema'

/**
 * Administrator user management. Every function re-resolves the viewer from the
 * session and checks a global permission — a client claiming to be an admin
 * proves nothing. Moderators are deliberately excluded: they carry
 * `listing:moderate`, not `user:setRole` or `user:ban`. See ADR 0010.
 */

const globalRoleSchema = z.enum(['user', 'moderator', 'admin'])

export const setUserRoleInputSchema = z.object({
  userId: z.string().min(1),
  role: globalRoleSchema,
})

export const banUserInputSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().trim().min(1).optional(),
  /** Epoch milliseconds; omitted means the ban does not expire. */
  expiresAt: z.number().int().positive().optional(),
})

export const unbanUserInputSchema = z.object({ userId: z.string().min(1) })

export interface AdminUserSummary {
  id: string
  email: string
  displayName: string
  role: GlobalRole
  banned: boolean
  banReason: string | null
  banExpiresAt: string | null
  emailVerified: boolean
}

type AdminDeps = { viewer: Viewer; database?: PetBuddiesDrizzleDatabase }

async function databaseFor(deps: AdminDeps): Promise<PetBuddiesDrizzleDatabase> {
  return deps.database ?? (await resolveRequestDatabase())
}

export async function listUsersForAdmin(deps: AdminDeps): Promise<{ items: AdminUserSummary[] }> {
  requireGlobalPermission(deps.viewer, 'user', 'setRole')
  const database = await databaseFor(deps)

  const rows = await database
    .select({
      id: schema.users.id,
      email: schema.users.email,
      displayName: schema.users.displayName,
      role: schema.users.role,
      banned: schema.users.banned,
      banReason: schema.users.banReason,
      banExpires: schema.users.banExpires,
      emailVerified: schema.users.emailVerified,
    })
    .from(schema.users)
    .all()

  return {
    items: rows.map((row) => ({
      id: row.id,
      email: row.email,
      displayName: row.displayName,
      role: row.role,
      banned: row.banned,
      banReason: row.banReason,
      banExpiresAt: row.banExpires ? row.banExpires.toISOString() : null,
      emailVerified: row.emailVerified,
    })),
  }
}

/**
 * Changes a user's global role.
 *
 * Refuses to demote the last remaining administrator: an instance with no admin
 * has no way back, because granting the admin role itself requires an admin.
 */
export async function setUserRoleForAdmin(
  deps: AdminDeps,
  input: z.infer<typeof setUserRoleInputSchema>,
): Promise<{ user: AdminUserSummary }> {
  requireGlobalPermission(deps.viewer, 'user', 'setRole')
  const database = await databaseFor(deps)

  const target = await database
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, input.userId))
    .get()
  if (!target) throw new AuthzError('CONFLICT', 'That user no longer exists.')

  if (target.role === 'admin' && input.role !== 'admin') {
    const otherAdmin = await database
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(and(eq(schema.users.role, 'admin'), ne(schema.users.id, target.id)))
      .get()
    if (!otherAdmin) {
      throw new AuthzError('CONFLICT', 'Promote another administrator before demoting the last one.')
    }
  }

  await database
    .update(schema.users)
    .set({ role: input.role })
    .where(eq(schema.users.id, input.userId))
    .run()

  return { user: await requireUserSummary(database, input.userId) }
}

export async function banUserForAdmin(
  deps: AdminDeps,
  input: z.infer<typeof banUserInputSchema>,
): Promise<{ user: AdminUserSummary }> {
  requireGlobalPermission(deps.viewer, 'user', 'ban')
  if (deps.viewer.kind === 'user' && deps.viewer.id === input.userId) {
    throw new AuthzError('CONFLICT', 'You cannot ban your own account.')
  }
  const database = await databaseFor(deps)

  await database
    .update(schema.users)
    .set({
      banned: true,
      banReason: input.reason ?? null,
      banExpires: input.expiresAt ? new Date(input.expiresAt) : null,
    })
    .where(eq(schema.users.id, input.userId))
    .run()

  return { user: await requireUserSummary(database, input.userId) }
}

export async function unbanUserForAdmin(
  deps: AdminDeps,
  input: z.infer<typeof unbanUserInputSchema>,
): Promise<{ user: AdminUserSummary }> {
  requireGlobalPermission(deps.viewer, 'user', 'ban')
  const database = await databaseFor(deps)

  await database
    .update(schema.users)
    .set({ banned: false, banReason: null, banExpires: null })
    .where(eq(schema.users.id, input.userId))
    .run()

  return { user: await requireUserSummary(database, input.userId) }
}

async function requireUserSummary(
  database: PetBuddiesDrizzleDatabase,
  userId: string,
): Promise<AdminUserSummary> {
  const row = await database.select().from(schema.users).where(eq(schema.users.id, userId)).get()
  if (!row) throw new AuthzError('CONFLICT', 'That user no longer exists.')
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    role: row.role,
    banned: row.banned,
    banReason: row.banReason,
    banExpiresAt: row.banExpires ? row.banExpires.toISOString() : null,
    emailVerified: row.emailVerified,
  }
}

export const listUsers = createServerFn({ method: 'POST' }).handler(async () =>
  listUsersForAdmin({ viewer: await resolveRequestViewer() }),
)

export const setUserRole = createServerFn({ method: 'POST' })
  .validator(setUserRoleInputSchema)
  .handler(async ({ data }) => setUserRoleForAdmin({ viewer: await resolveRequestViewer() }, data))

export const banUser = createServerFn({ method: 'POST' })
  .validator(banUserInputSchema)
  .handler(async ({ data }) => banUserForAdmin({ viewer: await resolveRequestViewer() }, data))

export const unbanUser = createServerFn({ method: 'POST' })
  .validator(unbanUserInputSchema)
  .handler(async ({ data }) => unbanUserForAdmin({ viewer: await resolveRequestViewer() }, data))
