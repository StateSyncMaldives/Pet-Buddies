import { createDrizzleDatabaseFromD1, type PetBuddiesDrizzleDatabase } from '../infra/db/d1-drizzle'
import { seedDurableStore } from '../infra/db/seed-durable-store'
import * as schema from '../infra/db/schema'
import { getWorkerEnv } from '../infra/cloudflare/worker-env'
import { createInMemoryAsyncBackend, type AsyncAppBackend } from './app-backend'
import { createDurableBackend } from './durable-backend'
import { createPrototypeBackend } from './prototype-backend'

/**
 * Resolves the application backend for a server request. When a D1 database is
 * reachable (a `database` is passed, or the Worker exposes the `DB` binding)
 * AND its schema is present, the durable D1-backed backend is used, seeding the
 * baseline data on first use. Otherwise an in-memory backend is the fallback
 * (vitest, local dev without Wrangler, or a D1 whose migrations have not been
 * applied yet) — so wiring the durable path in never blanks the running app.
 * The in-memory backend also backs the durable backend's not-yet-durablised
 * writes. See ADR 0008.
 */
export async function createServerBackend(
  deps: { database?: PetBuddiesDrizzleDatabase } = {},
): Promise<AsyncAppBackend> {
  const fallback = createInMemoryAsyncBackend(createPrototypeBackend())

  let database = deps.database
  if (!database) {
    const env = await getWorkerEnv()
    if (env?.DB) {
      database = createDrizzleDatabaseFromD1(env.DB)
    }
  }

  if (!database) {
    return fallback
  }

  try {
    // Querying the listings table both validates the schema exists and tells us
    // whether the store still needs its idempotent baseline seed.
    const existing = await database.select({ id: schema.listings.id }).from(schema.listings).limit(1).all()
    if (existing.length === 0) {
      await seedDurableStore({ db: database })
    }
    return createDurableBackend({ database, fallback })
  } catch (error) {
    console.warn('[pet-buddies] durable D1 backend unavailable; using in-memory fallback', error)
    return fallback
  }
}
