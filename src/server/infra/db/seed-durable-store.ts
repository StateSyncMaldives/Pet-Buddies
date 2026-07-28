import type { drizzle } from 'drizzle-orm/d1'

import type { UserRecord } from '../../../../backend/contracts'
import type { createAuth } from '../../auth/auth'
import { seedAuth } from '../../auth/seed-auth'
import { buildSeedListingAggregates } from '../../runtime/seed-listing-aggregates'
import { seedClinicRecords } from '../repositories/drizzle-clinic-repository'
import { seedListingAggregates } from '../repositories/drizzle-listing-repository'
import * as schema from './schema'

type PetBuddiesDb = ReturnType<typeof drizzle<typeof schema>>

function toUserInsert(user: UserRecord): typeof schema.users.$inferInsert {
  return {
    id: user.id,
    googleSub: user.googleSub,
    email: user.email,
    emailVerified: user.emailVerified,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    role: user.role,
    banned: user.banned,
    // users.createdAt/updatedAt are Better-Auth-managed integer/timestamp
    // columns — drizzle expects native Date, while UserRecord keeps ISO
    // strings at the app boundary.
    createdAt: new Date(user.createdAt),
    updatedAt: new Date(user.updatedAt),
  }
}

/**
 * Idempotently seeds the durable store's baseline data:
 *  - when an `auth` instance is supplied, the bootstrap administrator and
 *    moderator accounts (real Better Auth credential accounts — see ADR 0010);
 *  - the seed listings and their owning organizations, owner users, and tags.
 *
 * Safe to run on every deploy — user rows use insert-or-ignore and the listing
 * batch skips existing rows, so repeated runs neither duplicate nor drift.
 * Clinics are persisted here too; app reads must come from D1, not the
 * in-memory seed repository. See ADR 0008.
 */
export async function seedDurableStore(input: {
  db: PetBuddiesDb
  auth?: ReturnType<typeof createAuth>
}): Promise<void> {
  if (input.auth) {
    await seedAuth({ auth: input.auth, database: input.db })
  }

  await seedListingAggregates(input.db, buildSeedListingAggregates())
  await seedClinicRecords(input.db)
}

/** Exported for tests that need to plant a specific user row directly. */
export { toUserInsert }
