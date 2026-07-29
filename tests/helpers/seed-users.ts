import type { drizzle } from 'drizzle-orm/d1'

import type { UserRecord } from '../../backend/contracts'
import * as schema from '../../src/server/infra/db/schema'
import { toUserInsert } from '../../src/server/infra/db/seed-durable-store'

type PetBuddiesDb = ReturnType<typeof drizzle<typeof schema>>

// Fixed timestamp so inserts are deterministic and idempotent.
const SEEDED_AT = '2026-07-02T08:00:00.000Z'

/**
 * Fixture user rows for backend tests. Viewer-owned writes (saved listings,
 * adoption inquiries, moderation events) reference `users.id` by foreign key,
 * so tests that exercise those paths need a real row to point at.
 *
 * These are test fixtures only. Production identities come from Better Auth —
 * `seedAuth` creates the bootstrap accounts (ADR 0010).
 */
export const TEST_VIEWER_USER: UserRecord = {
  id: 'user-test-viewer',
  googleSub: null,
  email: 'viewer@test.petbuddies.mv',
  emailVerified: true,
  displayName: 'Aishath Ali',
  avatarUrl: null,
  role: 'user',
  banned: false,
  createdAt: SEEDED_AT,
  updatedAt: SEEDED_AT,
}

export const TEST_MODERATOR_USER: UserRecord = {
  id: 'user-test-moderator',
  googleSub: null,
  email: 'moderator@test.petbuddies.mv',
  emailVerified: true,
  displayName: 'Pet Buddies Moderator',
  avatarUrl: null,
  role: 'moderator',
  banned: false,
  createdAt: SEEDED_AT,
  updatedAt: SEEDED_AT,
}

export const TEST_SEED_USERS: readonly UserRecord[] = [TEST_VIEWER_USER, TEST_MODERATOR_USER]

/** Inserts the fixture users, ignoring rows that already exist. */
export async function insertTestUsers(db: PetBuddiesDb, users: readonly UserRecord[] = TEST_SEED_USERS) {
  for (const user of users) {
    await db.insert(schema.users).values(toUserInsert(user)).onConflictDoNothing().run()
  }
}
