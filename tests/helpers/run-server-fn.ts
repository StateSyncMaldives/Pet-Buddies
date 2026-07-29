import { createAuth } from '../../src/server/auth/auth'
import { resolveRequestViewer } from '../../src/server/auth/request-viewer'
import type { Viewer } from '../../src/server/auth/resolve-viewer'
import type { PetBuddiesDrizzleDatabase } from '../../src/server/infra/db/d1-drizzle'
import { seedDurableStore } from '../../src/server/infra/db/seed-durable-store'
import type { AsyncAppBackend } from '../../src/server/runtime/app-backend'
import { createDurableBackend } from '../../src/server/runtime/durable-backend'
import { createTestSession } from './auth'
import { createTestDatabase } from './test-database'

const TEST_SECRETS = {
  BETTER_AUTH_SECRET: 'x'.repeat(32),
  BETTER_AUTH_URL: 'http://localhost',
  GOOGLE_CLIENT_ID: 'id',
  GOOGLE_CLIENT_SECRET: 'secret',
} as const

export interface ServerFnHarness {
  database: PetBuddiesDrizzleDatabase
  auth: ReturnType<typeof createAuth>
  backend: AsyncAppBackend
  /** The viewer resolved from the minted session cookie — the real thing. */
  viewer: Viewer
}

/**
 * Builds a migrated D1, seeds it, mints a real session cookie for `role`, and
 * resolves the viewer from that cookie exactly as a request would.
 *
 * Server functions themselves only execute inside the Start server runtime
 * (their handlers are wired by the Start vite plugin, which the vitest config
 * deliberately does not load), so each guarded server function exports a
 * handler taking `{ viewer, backend }`. This harness supplies both, which
 * covers the whole chain that matters: cookie → session → viewer → guard →
 * backend.
 */
export async function createServerFnHarness(
  role: 'anonymous' | 'user' | 'moderator' | 'admin',
  options: { seed?: boolean } = {},
): Promise<ServerFnHarness> {
  const database = await createTestDatabase()
  const auth = createAuth({ database, secrets: TEST_SECRETS })

  if (options.seed !== false) {
    await seedDurableStore({ db: database })
  }

  const viewer =
    role === 'anonymous'
      ? await resolveRequestViewer({ headers: new Headers(), auth })
      : await resolveRequestViewer({
          headers: new Headers({ cookie: await createTestSession(auth, database, role) }),
          auth,
        })

  return { database, auth, backend: createDurableBackend({ database }), viewer }
}

/** Runs `invoke` with the viewer and backend of a freshly built harness. */
export async function runWithSession<T>(
  role: 'anonymous' | 'user' | 'moderator' | 'admin',
  invoke: (harness: ServerFnHarness) => Promise<T>,
  options?: { seed?: boolean },
): Promise<T> {
  return invoke(await createServerFnHarness(role, options))
}

/** Shorthand for the signed-out case. */
export async function runAnonymous<T>(
  invoke: (harness: ServerFnHarness) => Promise<T>,
  options?: { seed?: boolean },
): Promise<T> {
  return runWithSession('anonymous', invoke, options)
}
