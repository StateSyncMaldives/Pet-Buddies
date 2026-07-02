import { describe, expect, it } from 'vitest'

import { getDbMigrations } from '../../../../../src/server/infra/db/migrate'

describe('db migrate seam', () => {
  it('discovers the initial schema migration in backend/sql', () => {
    const migrations = getDbMigrations()

    expect(migrations.map((migration) => migration.filename)).toContain('001_initial_schema.sql')
    expect(migrations[0]?.sql).toContain('CREATE TABLE')
  })
})
