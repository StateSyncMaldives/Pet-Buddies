import type { UserRecord } from '../../../backend/contracts'

// Fixed timestamp so seeding is deterministic and idempotent.
const SEEDED_AT = '2026-07-02T08:00:00.000Z'

/**
 * The demo Viewer's durable User identity. `viewerId` references this stable id
 * (not the display name), so saved listings, adoption inquiries, and other
 * Viewer-owned writes satisfy the users.id foreign keys. See ADR 0008.
 */
export const DEMO_VIEWER_USER: UserRecord = {
  id: 'user-demo-viewer',
  googleSub: 'demo-viewer',
  email: 'aishath.ali@demo.petbuddies.mv',
  displayName: 'Aishath Ali',
  avatarUrl: null,
  globalRole: 'user',
  createdAt: SEEDED_AT,
  updatedAt: SEEDED_AT,
}

/** The demo moderator's durable User identity, referenced by moderation events. */
export const DEMO_MODERATOR_USER: UserRecord = {
  id: 'user-demo-moderator',
  googleSub: 'demo-moderator',
  email: 'moderator@demo.petbuddies.mv',
  displayName: 'Pet Buddies Moderator',
  avatarUrl: null,
  globalRole: 'moderator',
  createdAt: SEEDED_AT,
  updatedAt: SEEDED_AT,
}

export const DEMO_SEED_USERS: readonly UserRecord[] = [DEMO_VIEWER_USER, DEMO_MODERATOR_USER]
