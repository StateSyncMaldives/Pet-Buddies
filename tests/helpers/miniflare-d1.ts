import { drizzle } from 'drizzle-orm/d1'
import { Miniflare } from 'miniflare'
import { afterEach } from 'vitest'

import { createD1MigrationClient } from '../../src/server/infra/db/client'
import { applyDbMigrations } from '../../src/server/infra/db/migrate'
import * as schema from '../../src/server/infra/db/schema'

const WORKER_SCRIPT = `export default { fetch() { return new Response("ok") } }`

export interface MiniflareD1Options {
  /** Apply the canonical migrations after creating the database. Defaults to true. */
  applyMigrations?: boolean
}

/**
 * Registers per-test Miniflare D1 boilerplate for a test file: each call to
 * the returned factory spins up a fresh Miniflare with a `DB` D1 binding
 * (one instance per test — no sharing), and an `afterEach` hook disposes it.
 */
export function useMiniflareD1(databaseName: string, options: MiniflareD1Options = {}) {
  const applyMigrations = options.applyMigrations ?? true
  let miniflare: Miniflare | undefined

  afterEach(async () => {
    await miniflare?.dispose()
    miniflare = undefined
  })

  return async function createMiniflareD1() {
    miniflare = new Miniflare({
      modules: true,
      script: WORKER_SCRIPT,
      d1Databases: { DB: databaseName },
    })
    const d1 = await miniflare.getD1Database('DB')
    if (applyMigrations) {
      await applyDbMigrations(createD1MigrationClient(d1))
    }

    return { d1, db: drizzle(d1, { schema }) }
  }
}
