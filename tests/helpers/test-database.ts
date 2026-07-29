import { Miniflare } from 'miniflare'
import { afterEach } from 'vitest'

import { createD1MigrationClient } from '../../src/server/infra/db/client'
import { createDrizzleDatabaseFromD1, type PetBuddiesDrizzleDatabase } from '../../src/server/infra/db/d1-drizzle'
import { applyDbMigrations } from '../../src/server/infra/db/migrate'

const WORKER_SCRIPT = `export default { fetch() { return new Response("ok") } }`

let instanceCounter = 0

// Tracks every Miniflare instance created by `createTestDatabase()` in the
// current test file so the `afterEach` below can dispose them without
// changing the helper's call shape (`const database = await createTestDatabase()`).
// Registering the hook at module load — like `tests/helpers/miniflare-d1.ts`'s
// `useMiniflareD1` does — relies on Vitest isolating this module per spec
// file, so the hook is scoped to whichever file imported it.
const pendingInstances = new Set<Miniflare>()

afterEach(async () => {
  const instances = Array.from(pendingInstances)
  pendingInstances.clear()
  await Promise.all(instances.map((miniflare) => miniflare.dispose()))
})

/**
 * Spins up a fresh Miniflare D1 database, applies all `drizzle/` migrations,
 * and returns a fully-migrated `PetBuddiesDrizzleDatabase`. The underlying
 * Miniflare instance is disposed automatically after the test that created it
 * finishes (see the module-level `afterEach` above) — callers don't need to
 * (and can't) dispose it manually.
 */
export async function createTestDatabase(): Promise<PetBuddiesDrizzleDatabase> {
  instanceCounter += 1
  const miniflare = new Miniflare({
    modules: true,
    script: WORKER_SCRIPT,
    d1Databases: { DB: `pet-buddies-test-db-${instanceCounter}` },
  })
  pendingInstances.add(miniflare)
  const d1 = await miniflare.getD1Database('DB')
  await applyDbMigrations(createD1MigrationClient(d1))

  return createDrizzleDatabaseFromD1(d1)
}
