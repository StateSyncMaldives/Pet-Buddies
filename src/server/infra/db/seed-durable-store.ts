import type { drizzle } from 'drizzle-orm/d1'

import type { UserRecord } from '../../../../backend/contracts'
import { DEMO_SEED_USERS } from '../../runtime/demo-identity'
import * as schema from './schema'

type PetBuddiesDb = ReturnType<typeof drizzle<typeof schema>>

function toUserInsert(user: UserRecord): typeof schema.users.$inferInsert {
  return {
    id: user.id,
    googleSub: user.googleSub,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    globalRole: user.globalRole,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

/**
 * Idempotently seeds the durable store's baseline identity: the demo Viewer and
 * moderator User rows that Viewer-owned writes (saved listings, adoption
 * inquiries, moderation events) reference by users.id. Safe to run on every
 * deploy — conflicting rows are left untouched. See ADR 0008.
 *
 * Listing/organization/clinic/tag seeding is a follow-up increment.
 */
export async function seedDurableStore(input: { db: PetBuddiesDb }): Promise<void> {
  for (const user of DEMO_SEED_USERS) {
    await input.db.insert(schema.users).values(toUserInsert(user)).onConflictDoNothing().run()
  }
}
