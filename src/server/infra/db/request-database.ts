import { getWorkerEnv } from '../cloudflare/worker-env'
import { createDrizzleDatabaseFromD1, type PetBuddiesDrizzleDatabase } from './d1-drizzle'

/**
 * The Drizzle database for the current request, built from the Worker's D1
 * binding. Like the backend and the auth instance, it is built per request and
 * never cached at module scope (ADR 0003 / 0008).
 */
export async function resolveRequestDatabase(): Promise<PetBuddiesDrizzleDatabase> {
  const env = await getWorkerEnv()
  if (!env?.DB) {
    throw new Error('D1 database binding is required; refusing to serve in-memory demo data.')
  }
  return createDrizzleDatabaseFromD1(env.DB)
}
