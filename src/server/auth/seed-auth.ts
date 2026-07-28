import { eq } from 'drizzle-orm'

import type { GlobalRole } from '../contracts/api'
import type { PetBuddiesDrizzleDatabase } from '../infra/db/d1-drizzle'
import * as schema from '../infra/db/schema'
import type { createAuth } from './auth'

type Auth = ReturnType<typeof createAuth>

export interface BootstrapAccountSpec {
  email: string
  password: string
  name: string
  role: GlobalRole
}

/**
 * The bootstrap accounts every environment starts with. Passwords are
 * placeholders meant to be rotated immediately after the first deploy — they
 * exist so the very first administrator can sign in without a chicken-and-egg
 * problem (nobody can grant the admin role until an admin exists).
 */
export const BOOTSTRAP_ACCOUNTS = {
  admin: {
    email: 'admin@petbuddies.mv',
    password: 'change-me-admin-0000',
    name: 'Pet Buddies Admin',
    role: 'admin',
  },
  moderator: {
    email: 'moderator@petbuddies.mv',
    password: 'change-me-mod-0000',
    name: 'Pet Buddies Moderator',
    role: 'moderator',
  },
} as const satisfies Record<string, BootstrapAccountSpec>

/**
 * Creates the account through the Better Auth API — never by direct insert — so
 * the password is hashed with the configured hasher and the matching
 * `credential` row lands in `account`. The elevated role is then written
 * directly, because the admin plugin has no "promote without an acting admin"
 * entry point.
 */
async function ensureUser(
  deps: { auth: Auth; database: PetBuddiesDrizzleDatabase },
  spec: BootstrapAccountSpec,
): Promise<string> {
  const existing = await deps.database
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, spec.email))
    .get()

  if (existing) {
    if (existing.role !== spec.role) {
      await deps.database
        .update(schema.users)
        .set({ role: spec.role })
        .where(eq(schema.users.id, existing.id))
        .run()
    }
    return existing.id
  }

  await deps.auth.api.signUpEmail({
    body: { email: spec.email, password: spec.password, name: spec.name },
  })

  const created = await deps.database
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, spec.email))
    .get()
  if (!created) throw new Error(`seedAuth: failed to create ${spec.email}`)

  await deps.database
    .update(schema.users)
    .set({ role: spec.role })
    .where(eq(schema.users.id, created.id))
    .run()

  return created.id
}

/**
 * Idempotently seeds the bootstrap administrator and moderator. Safe to run on
 * every deploy: existing rows are matched by email and only their role is
 * re-asserted, so repeated runs neither duplicate accounts nor reset passwords.
 */
export async function seedAuth(deps: {
  auth: Auth
  database: PetBuddiesDrizzleDatabase
}): Promise<{ adminUserId: string; moderatorUserId: string }> {
  const adminUserId = await ensureUser(deps, BOOTSTRAP_ACCOUNTS.admin)
  const moderatorUserId = await ensureUser(deps, BOOTSTRAP_ACCOUNTS.moderator)
  return { adminUserId, moderatorUserId }
}
