import { createDrizzleDatabaseFromD1, type PetBuddiesDrizzleDatabase } from '../infra/db/d1-drizzle'
import { seedDurableStore } from '../infra/db/seed-durable-store'
import * as schema from '../infra/db/schema'
import { getWorkerEnv } from '../infra/cloudflare/worker-env'
import type { AsyncAppBackend } from './app-backend'
import { createDurableBackend } from './durable-backend'

/**
 * Resolves the application backend for a server request. The app data source is
 * D1 only: when no database binding is available, fail loudly instead of
 * serving in-memory demo data.
 */
export async function createServerBackend(
  deps: { database?: PetBuddiesDrizzleDatabase } = {},
): Promise<AsyncAppBackend> {
  let database = deps.database
  if (!database) {
    const env = await getWorkerEnv()
    if (env?.DB) {
      database = createDrizzleDatabaseFromD1(env.DB)
    }
  }

  if (!database) {
    throw new Error('D1 database binding is required; refusing to serve in-memory demo data.')
  }

  try {
    const existing = await database.select({ id: schema.listings.id }).from(schema.listings).limit(1).all()
    if (existing.length === 0) {
      await seedDurableStore({ db: database })
    }
    return createDurableBackend({ database })
  } catch (error) {
    console.error('Durable D1 backend unavailable.', error)
    throw new Error('Durable D1 backend unavailable.')
  }
}
