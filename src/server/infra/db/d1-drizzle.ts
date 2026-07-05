import { drizzle } from 'drizzle-orm/d1'

import * as schema from './schema'

export function createDrizzleDatabaseFromD1(database: D1Database) {
  return drizzle(database, { schema })
}

export type PetBuddiesDrizzleDatabase = ReturnType<typeof createDrizzleDatabaseFromD1>
