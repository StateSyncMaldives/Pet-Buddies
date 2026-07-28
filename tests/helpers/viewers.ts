import type { Viewer } from '../../src/server/auth/resolve-viewer'

import { TEST_MODERATOR_USER, TEST_VIEWER_USER } from './seed-users'

function toViewer(user: typeof TEST_VIEWER_USER): Extract<Viewer, { kind: 'user' }> {
  return {
    kind: 'user',
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    banned: user.banned,
  }
}

/** A signed-in plain user — the default viewer for UI harness renders. */
export const TEST_VIEWER = toViewer(TEST_VIEWER_USER)

/** A signed-in moderator, for review-queue and moderation UI. */
export const TEST_MODERATOR_VIEWER = toViewer(TEST_MODERATOR_USER)

export const ANONYMOUS_VIEWER: Viewer = { kind: 'anonymous' }
