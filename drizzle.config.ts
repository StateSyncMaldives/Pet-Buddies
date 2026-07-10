import { defineConfig } from 'drizzle-kit'

// Drizzle is the single source of truth for the D1 schema. `drizzle-kit generate`
// emits SQLite/D1-compatible migrations from src/server/infra/db/schema.ts,
// including the CHECK constraints declared there. See ADR 0008.
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/server/infra/db/schema.ts',
  out: './drizzle',
})
