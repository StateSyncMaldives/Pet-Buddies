import { createAuth } from '../auth/auth'
import { resolveBootstrapAccounts, type BootstrapAccountSpec } from '../auth/seed-auth'
import { createDrizzleDatabaseFromD1, type PetBuddiesDrizzleDatabase } from '../infra/db/d1-drizzle'
import { seedDurableStore } from '../infra/db/seed-durable-store'
import * as schema from '../infra/db/schema'
import { getWorkerEnv } from '../infra/cloudflare/worker-env'
import type { AsyncAppBackend } from './app-backend'
import { createDurableBackend } from './durable-backend'

/**
 * Builds the auth deps for a cold-start seed, if this environment is configured
 * for one. Returns nothing when the auth secrets or the bootstrap credentials
 * are absent, so a fresh deploy ends up with no administrator rather than one
 * whose password is published in the repository.
 *
 * Seeding failures never take the backend down — the app still serves reads
 * without a bootstrap account.
 */
async function resolveSeedAuthDeps(
  database: PetBuddiesDrizzleDatabase,
): Promise<{ auth?: ReturnType<typeof createAuth>; bootstrapAccounts?: BootstrapAccountSpec[] | null }> {
  try {
    const env = await getWorkerEnv()
    const accounts = resolveBootstrapAccounts(env)
    if (!accounts) {
      console.info(
        'Cold-start seed: no BOOTSTRAP_ADMIN_EMAIL/BOOTSTRAP_ADMIN_PASSWORD set, so no administrator was created.',
      )
      return { bootstrapAccounts: null }
    }
    if (!env?.BETTER_AUTH_SECRET || !env.BETTER_AUTH_URL) {
      console.warn('Cold-start seed: auth secrets missing, skipping bootstrap administrator.')
      return { bootstrapAccounts: null }
    }

    return {
      auth: createAuth({
        database,
        secrets: {
          BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET,
          BETTER_AUTH_URL: env.BETTER_AUTH_URL,
          GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID ?? '',
          GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET ?? '',
        },
      }),
      bootstrapAccounts: accounts,
    }
  } catch (error) {
    console.error('Cold-start seed: could not resolve bootstrap auth deps.', error)
    return { bootstrapAccounts: null }
  }
}

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
      await seedDurableStore({ db: database, ...(await resolveSeedAuthDeps(database)) })
    }
    return createDurableBackend({ database })
  } catch (error) {
    console.error('Durable D1 backend unavailable.', error)
    throw new Error('Durable D1 backend unavailable.')
  }
}
