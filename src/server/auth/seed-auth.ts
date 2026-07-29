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
 * Fixed bootstrap accounts for tests and local harnesses ONLY.
 *
 * These passwords are committed to the repository, so seeding them into a
 * deployed environment would publish an administrator login. Production reads
 * its credentials from secrets instead — see `resolveBootstrapAccounts`, which
 * returns nothing when they are unset so that no known-password administrator
 * can ever be created by accident.
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

/** The secrets a deployed environment supplies to bootstrap its first admin. */
export interface BootstrapAccountEnv {
  BOOTSTRAP_ADMIN_EMAIL?: string
  BOOTSTRAP_ADMIN_PASSWORD?: string
  BOOTSTRAP_MODERATOR_EMAIL?: string
  BOOTSTRAP_MODERATOR_PASSWORD?: string
}

/**
 * The bootstrap accounts a deployed environment should create, or `null` when
 * it has not been configured to create any.
 *
 * Returning `null` rather than falling back to `BOOTSTRAP_ACCOUNTS` is the
 * point: those passwords are in the repository, so an unconfigured environment
 * must end up with NO administrator rather than one anybody could sign in as.
 * The operator sets BOOTSTRAP_ADMIN_EMAIL/PASSWORD as secrets, deploys, signs
 * in once, and promotes a real account from /admin/users.
 */
export function resolveBootstrapAccounts(
  env: BootstrapAccountEnv | null | undefined,
): BootstrapAccountSpec[] | null {
  const adminEmail = env?.BOOTSTRAP_ADMIN_EMAIL?.trim()
  const adminPassword = env?.BOOTSTRAP_ADMIN_PASSWORD
  if (!adminEmail || !adminPassword) return null

  const accounts: BootstrapAccountSpec[] = [
    { email: adminEmail, password: adminPassword, name: 'Pet Buddies Admin', role: 'admin' },
  ]

  // The moderator is optional — an administrator can appoint one from the UI.
  const moderatorEmail = env?.BOOTSTRAP_MODERATOR_EMAIL?.trim()
  const moderatorPassword = env?.BOOTSTRAP_MODERATOR_PASSWORD
  if (moderatorEmail && moderatorPassword) {
    accounts.push({
      email: moderatorEmail,
      password: moderatorPassword,
      name: 'Pet Buddies Moderator',
      role: 'moderator',
    })
  }

  return accounts
}

/**
 * Idempotently seeds bootstrap accounts. Safe to run on every deploy: existing
 * rows are matched by email and only their role is re-asserted, so repeated
 * runs neither duplicate accounts nor reset passwords.
 *
 * Defaults to the test accounts; deployed callers pass `accounts` from
 * `resolveBootstrapAccounts`.
 */
export async function seedAuth(deps: {
  auth: Auth
  database: PetBuddiesDrizzleDatabase
  accounts?: readonly BootstrapAccountSpec[]
}): Promise<{ adminUserId: string; moderatorUserId?: string; userIds: string[] }> {
  if (deps.accounts) {
    const userIds: string[] = []
    for (const spec of deps.accounts) {
      userIds.push(await ensureUser(deps, spec))
    }
    const adminIndex = deps.accounts.findIndex((account) => account.role === 'admin')
    const moderatorIndex = deps.accounts.findIndex((account) => account.role === 'moderator')
    return {
      adminUserId: userIds[adminIndex] ?? userIds[0]!,
      moderatorUserId: moderatorIndex === -1 ? undefined : userIds[moderatorIndex],
      userIds,
    }
  }

  const adminUserId = await ensureUser(deps, BOOTSTRAP_ACCOUNTS.admin)
  const moderatorUserId = await ensureUser(deps, BOOTSTRAP_ACCOUNTS.moderator)
  return { adminUserId, moderatorUserId, userIds: [adminUserId, moderatorUserId] }
}
