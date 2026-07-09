import { describe, expect, it } from 'vitest'

import { getDbMigrations } from '../../../../../src/server/infra/db/migrate'

describe('db migrate seam', () => {
  it('discovers the drizzle-generated migrations', () => {
    const migrations = getDbMigrations()

    expect(migrations.map((migration) => migration.filename)).toContain('0000_initial_schema.sql')
    expect(migrations[0]?.sql).toContain('CREATE TABLE')
    // The schema is the single source of truth: enum/boolean/composite rules
    // are emitted as CHECK constraints (see drizzle.config.ts).
    expect(migrations[0]?.sql).toContain('CHECK')
  })
})
