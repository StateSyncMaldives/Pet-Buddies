import { Miniflare } from 'miniflare'

import { createD1MigrationClient } from '../../src/server/infra/db/client'
import { createDrizzleDatabaseFromD1, type PetBuddiesDrizzleDatabase } from '../../src/server/infra/db/d1-drizzle'
import { applyDbMigrations } from '../../src/server/infra/db/migrate'

const WORKER_SCRIPT = `export default { fetch() { return new Response("ok") } }`

let instanceCounter = 0

/**
 * Spins up a fresh Miniflare D1 database, applies all `drizzle/` migrations,
 * and returns a fully-migrated `PetBuddiesDrizzleDatabase`.
 *
 * Unlike `useMiniflareD1` (which registers an `afterEach` hook for a whole
 * test file), this is a standalone one-shot helper: callers that need
 * teardown should dispose the Miniflare instance themselves, or rely on the
 * process exiting at the end of the test run. It exists for call sites (like
 * `createAuth`) that just need "a real migrated database" without wiring up
 * suite-level lifecycle hooks.
 */
export async function createTestDatabase(): Promise<PetBuddiesDrizzleDatabase> {
  instanceCounter += 1
  const miniflare = new Miniflare({
    modules: true,
    script: WORKER_SCRIPT,
    d1Databases: { DB: `pet-buddies-test-db-${instanceCounter}` },
  })
  const d1 = await miniflare.getD1Database('DB')
  await applyDbMigrations(createD1MigrationClient(d1))

  return createDrizzleDatabaseFromD1(d1)
}
