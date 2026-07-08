import { createDrizzleDatabaseFromD1, type PetBuddiesDrizzleDatabase } from '../infra/db/d1-drizzle'
import { getWorkerEnv } from '../infra/cloudflare/worker-env'
import { createInMemoryAsyncBackend, type AsyncAppBackend } from './app-backend'
import { createDurableBackend } from './durable-backend'
import { createPrototypeBackend } from './prototype-backend'

/**
 * Resolves the application backend for a server request. When a D1 database is
 * reachable (a `database` is passed, or the Worker exposes the `DB` binding),
 * the durable D1-backed backend is used; otherwise an in-memory backend is the
 * fallback (vitest, local dev without Wrangler). The in-memory backend also
 * serves as the durable backend's fallback for the not-yet-durablised writes.
 * See ADR 0008.
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

  return createDurableBackend({ database, fallback })
}
