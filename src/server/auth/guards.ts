import { and, eq } from 'drizzle-orm'

import type { GlobalRole, OrganizationMemberRole } from '../contracts/api'
import type { PetBuddiesDrizzleDatabase } from '../infra/db/d1-drizzle'
import * as schema from '../infra/db/schema'
import { GLOBAL_STATEMENTS, hasPermission } from './access-control'
import { AuthzError } from './authz-error'
import { canWrite, type Viewer } from './resolve-viewer'

export { AuthzError, type AuthzErrorCode } from './authz-error'

/**
 * Server-side authorization guards. Every server function that does more than a
 * public read calls one of these; client-side role checks are UI hinting only.
 * See ADR 0010.
 */

/** Signed in and not banned. Throws UNAUTHORIZED / FORBIDDEN respectively. */
export function requireViewer(viewer: Viewer): asserts viewer is Extract<Viewer, { kind: 'user' }> {
  if (viewer.kind !== 'user') throw new AuthzError('UNAUTHORIZED', 'Sign in required.')
  if (!canWrite(viewer)) throw new AuthzError('FORBIDDEN', 'Your account is suspended.')
}

const GLOBAL_ROLE_ORDER: Record<GlobalRole, number> = { user: 0, moderator: 1, admin: 2 }

/** At least `role`. Admins satisfy a moderator requirement, not the reverse. */
export function requireGlobalRole(viewer: Viewer, role: GlobalRole): void {
  requireViewer(viewer)
  if (GLOBAL_ROLE_ORDER[viewer.role] < GLOBAL_ROLE_ORDER[role]) {
    throw new AuthzError('FORBIDDEN', `Requires the ${role} role.`)
  }
}

/**
 * The preferred global check: asks the access-control policy whether the
 * viewer's role carries a specific permission, so adding a role never means
 * hunting down hard-coded role comparisons.
 */
export function requireGlobalPermission<Resource extends keyof typeof GLOBAL_STATEMENTS>(
  viewer: Viewer,
  resource: Resource,
  action: (typeof GLOBAL_STATEMENTS)[Resource][number],
): void {
  requireViewer(viewer)
  if (!hasPermission(viewer.role, resource, action)) {
    throw new AuthzError('FORBIDDEN', `Missing permission ${String(resource)}:${String(action)}.`)
  }
}

const ORG_ROLE_ORDER: Record<OrganizationMemberRole, number> = {
  member: 0,
  listing_manager: 1,
  admin: 2,
}

/**
 * Organization membership lives in the app's own `organization_members` table
 * (not Better Auth's organization plugin), so this reads it directly.
 */
export async function requireOrgRole(
  deps: { database: PetBuddiesDrizzleDatabase },
  viewer: Viewer,
  organizationId: string,
  role: OrganizationMemberRole,
): Promise<void> {
  requireViewer(viewer)

  const membership = await deps.database
    .select({ role: schema.organizationMembers.role })
    .from(schema.organizationMembers)
    .where(
      and(
        eq(schema.organizationMembers.organizationId, organizationId),
        eq(schema.organizationMembers.userId, viewer.id),
      ),
    )
    .get()

  if (!membership || ORG_ROLE_ORDER[membership.role] < ORG_ROLE_ORDER[role]) {
    throw new AuthzError('FORBIDDEN', `Requires the ${role} role in this organization.`)
  }
}
