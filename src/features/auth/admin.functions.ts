import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, ne } from 'drizzle-orm'
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

export const setOrganizationVerificationInputSchema = z.object({
  organizationId: z.string().min(1),
  verified: z.boolean(),
  /** ISO timestamp for the verification; defaults to now. */
  verifiedAt: z.string().datetime().optional(),
})

export interface AdminOrganizationSummary {
  id: string
  slug: string
  name: string
  isVerified: boolean
  verifiedAt: string | null
}

export async function listOrganizationsForAdmin(
  deps: AdminDeps,
): Promise<{ items: AdminOrganizationSummary[] }> {
  requireGlobalPermission(deps.viewer, 'org', 'verify')
  const database = await databaseFor(deps)

  const rows = await database
    .select({
      id: schema.organizations.id,
      slug: schema.organizations.slug,
      name: schema.organizations.name,
      isVerified: schema.organizations.isVerified,
      verifiedAt: schema.organizations.verifiedAt,
    })
    .from(schema.organizations)
    .all()

  return { items: rows }
}

/**
 * Marks an organization verified (or withdraws it). Verification is a trust
 * signal adopters see on listings, so it is admin-only — moderators can action
 * listings but not vouch for an organization.
 */
export async function setOrganizationVerificationForAdmin(
  deps: AdminDeps,
  input: z.infer<typeof setOrganizationVerificationInputSchema>,
): Promise<{ organization: AdminOrganizationSummary }> {
  requireGlobalPermission(deps.viewer, 'org', 'verify')
  const database = await databaseFor(deps)

  const existing = await database
    .select({ id: schema.organizations.id })
    .from(schema.organizations)
    .where(eq(schema.organizations.id, input.organizationId))
    .get()
  if (!existing) throw new AuthzError('CONFLICT', 'That organization no longer exists.')

  await database
    .update(schema.organizations)
    .set({
      isVerified: input.verified,
      // Cleared on withdrawal so a stale timestamp can't imply current standing.
      verifiedAt: input.verified ? (input.verifiedAt ?? new Date().toISOString()) : null,
    })
    .where(eq(schema.organizations.id, input.organizationId))
    .run()

  const row = await database
    .select({
      id: schema.organizations.id,
      slug: schema.organizations.slug,
      name: schema.organizations.name,
      isVerified: schema.organizations.isVerified,
      verifiedAt: schema.organizations.verifiedAt,
    })
    .from(schema.organizations)
    .where(eq(schema.organizations.id, input.organizationId))
    .get()
  if (!row) throw new AuthzError('CONFLICT', 'That organization no longer exists.')

  return { organization: row }
}

export interface ModerationEventEntry {
  id: string
  action: 'submitted' | 'approved' | 'rejected' | 'adopted' | 'restored'
  reason: string | null
  listingId: string
  listingName: string | null
  actorEmail: string | null
  actorDisplayName: string | null
  createdAt: string
}

/**
 * The moderation audit trail: who actioned which listing, when, and why.
 *
 * Guarded by `listing:moderate` rather than a user-administration permission,
 * because this is the moderation record — a moderator has a legitimate claim
 * to it. The only screen rendering it today is admin-only, so in practice that
 * is the narrower of the two checks.
 *
 * Events are immutable and never edited, so a plain descending read is the
 * whole story. `limit` keeps the payload bounded as history accumulates.
 */
export async function listModerationEventsForAdmin(
  deps: AdminDeps,
  input: { limit?: number } = {},
): Promise<{ items: ModerationEventEntry[] }> {
  requireGlobalPermission(deps.viewer, 'listing', 'moderate')
  const database = await databaseFor(deps)

  const limit = Math.min(Math.max(input.limit ?? 50, 1), 200)

  const rows = await database
    .select({
      id: schema.moderationEvents.id,
      action: schema.moderationEvents.action,
      reason: schema.moderationEvents.reason,
      listingId: schema.moderationEvents.listingId,
      listingName: schema.listings.name,
      actorEmail: schema.users.email,
      actorDisplayName: schema.users.displayName,
      createdAt: schema.moderationEvents.createdAt,
    })
    .from(schema.moderationEvents)
    .leftJoin(schema.listings, eq(schema.listings.id, schema.moderationEvents.listingId))
    .leftJoin(schema.users, eq(schema.users.id, schema.moderationEvents.actorUserId))
    .orderBy(desc(schema.moderationEvents.createdAt))
    .limit(limit)
    .all()

  return { items: rows }
}

export const listModerationEvents = createServerFn({ method: 'POST' }).handler(async () =>
  listModerationEventsForAdmin({ viewer: await resolveRequestViewer() }),
)

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

export const listOrganizations = createServerFn({ method: 'POST' }).handler(async () =>
  listOrganizationsForAdmin({ viewer: await resolveRequestViewer() }),
)

export const verifyOrganization = createServerFn({ method: 'POST' })
  .validator(z.object({ organizationId: z.string().min(1) }))
  .handler(async ({ data }) =>
    setOrganizationVerificationForAdmin(
      { viewer: await resolveRequestViewer() },
      { ...data, verified: true },
    ),
  )

export const unverifyOrganization = createServerFn({ method: 'POST' })
  .validator(z.object({ organizationId: z.string().min(1) }))
  .handler(async ({ data }) =>
    setOrganizationVerificationForAdmin(
      { viewer: await resolveRequestViewer() },
      { ...data, verified: false },
    ),
  )
