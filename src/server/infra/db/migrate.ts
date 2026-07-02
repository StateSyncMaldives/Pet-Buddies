import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

import type { DbMigration } from './types'

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
