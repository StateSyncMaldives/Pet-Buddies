import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

import type { DbClient, DbMigration } from './types'

const MIGRATIONS_DIR = resolve(process.cwd(), 'backend/sql')

export function getDbMigrations(): DbMigration[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((filename) => filename.endsWith('.sql'))
    .sort()
    .map((filename) => ({
      id: filename.replace(/\.sql$/, ''),
      filename,
      sql: readFileSync(join(MIGRATIONS_DIR, filename), 'utf8'),
    }))
}

export async function applyDbMigrations(
  client: DbClient,
  migrations: DbMigration[] = getDbMigrations(),
): Promise<void> {
  for (const migration of migrations) {
    await client.execute(migration.sql)
  }
}
