// @vitest-environment node
//
// Guards the users-table rebuild in drizzle/0001 against a POPULATED database.
//
// The migration originally passed every check we had and still failed against
// production, because the local database was empty when it ran. `DROP TABLE
// users` performs an implicit `DELETE FROM`, which fires foreign-key actions:
// `listings.listed_by_user_id` is ON DELETE SET NULL, and `listings` carries
// `CHECK (organization_id IS NOT NULL OR listed_by_user_id IS NOT NULL)`, so
// dropping the parent nulls the owner of every user-owned listing and trips
// the CHECK. The migration's `PRAGMA foreign_keys=OFF` cannot save it — D1
// always enforces foreign keys, and `splitD1MigrationStatements` strips PRAGMA
// statements outright.
//
// So this seeds the shape production actually has before migrating.
import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { Miniflare } from 'miniflare'

import { createD1MigrationClient } from '../../../../../src/server/infra/db/client'
import { createDrizzleDatabaseFromD1 } from '../../../../../src/server/infra/db/d1-drizzle'
import { getDbMigrations } from '../../../../../src/server/infra/db/migrate'
import * as schema from '../../../../../src/server/infra/db/schema'

let counter = 0

/** A D1 migrated to `0000` only, populated the way production is. */
async function databaseAtInitialSchema() {
  counter += 1
  const miniflare = new Miniflare({
    modules: true,
    script: 'export default { fetch() { return new Response("ok") } }',
    d1Databases: { DB: `pet-buddies-auth-migration-${counter}` },
  })
  const d1 = await miniflare.getD1Database('DB')
  const client = createD1MigrationClient(d1)

  const migrations = getDbMigrations()
  const initial = migrations.find((migration) => migration.id.startsWith('0000'))
  const authMigration = migrations.find((migration) => migration.id.startsWith('0001'))
  if (!initial || !authMigration) throw new Error('expected migrations 0000 and 0001')

  await client.execute(initial.sql)

  // Production shape: organizations, tags, users (one of them a moderator),
  // org-owned AND user-owned listings, images, and tag assignments.
  await d1
    .prepare("INSERT INTO organizations (id, slug, name, kind) VALUES ('org-1', 'org-1', 'Org One', 'rescue')")
    .run()
  await d1.prepare("INSERT INTO tags (id, slug, label) VALUES ('tag-1', 'vaccinated', 'Vaccinated')").run()
  await d1
    .prepare(
      `INSERT INTO users (id, google_sub, email, display_name, global_role, created_at, updated_at)
       VALUES ('user-viewer', 'sub-viewer', 'viewer@example.com', 'Viewer', 'user', '2026-07-02 08:00:00', '2026-07-02 08:00:00'),
              ('user-mod', 'sub-mod', 'mod@example.com', 'Moderator', 'moderator', '2026-07-02 08:00:00', '2026-07-02 08:00:00')`,
    )
    .run()
  // The user-owned listing (organization_id NULL) is what makes the CHECK bite.
  await d1
    .prepare(
      `INSERT INTO listings (id, slug, species, name, age_text, area_label, story, status, listed_by_user_id, organization_id)
       VALUES ('listing-user', 'listing-user', 'cat', 'Mishka', '8 months', 'Malé', 'A cat.', 'live', 'user-viewer', NULL),
              ('listing-org',  'listing-org',  'cat', 'Simba',  '1 year',   'Malé', 'A cat.', 'live', NULL, 'org-1')`,
    )
    .run()
  await d1
    .prepare(
      "INSERT INTO listing_images (id, listing_id, object_key) VALUES ('img-1', 'listing-user', 'seed/a.jpg')",
    )
    .run()
  await d1
    .prepare("INSERT INTO listing_tag_assignments (listing_id, tag_id) VALUES ('listing-user', 'tag-1')")
    .run()

  return { d1, client, authMigration }
}

describe('drizzle/0001 against a populated database', () => {
  it('applies without tripping the listings owner CHECK', async () => {
    const { client, authMigration } = await databaseAtInitialSchema()

    // Before the fix this rejected with:
    //   CHECK constraint failed: organization_id IS NOT NULL OR listed_by_user_id IS NOT NULL
    await expect(client.execute(authMigration.sql)).resolves.not.toThrow()
  }, 30_000)

  it('preserves every user, including their global role', async () => {
    const { d1, client, authMigration } = await databaseAtInitialSchema()

    await client.execute(authMigration.sql)

    const database = createDrizzleDatabaseFromD1(d1)
    const users = await database.select().from(schema.users).all()
    expect(users).toHaveLength(2)
    // The original migration's INSERT…SELECT omitted global_role, silently
    // demoting every moderator and administrator to 'user'.
    const moderator = users.find((user) => user.id === 'user-mod')
    expect(moderator?.role).toBe('moderator')
    expect(users.find((user) => user.id === 'user-viewer')?.role).toBe('user')
  }, 30_000)

  it('preserves listings, their owners, images and tag assignments', async () => {
    const { d1, client, authMigration } = await databaseAtInitialSchema()

    await client.execute(authMigration.sql)

    const database = createDrizzleDatabaseFromD1(d1)
    const listings = await database.select().from(schema.listings).all()
    expect(listings).toHaveLength(2)
    expect(listings.find((listing) => listing.id === 'listing-user')?.listedByUserId).toBe('user-viewer')
    expect(listings.find((listing) => listing.id === 'listing-org')?.organizationId).toBe('org-1')

    expect(await database.select().from(schema.listingImages).all()).toHaveLength(1)
    expect(await database.select().from(schema.listingTagAssignments).all()).toHaveLength(1)
  }, 30_000)

  it('leaves google_sub nullable so Better Auth can create credential users', async () => {
    const { d1, client, authMigration } = await databaseAtInitialSchema()

    await client.execute(authMigration.sql)

    const database = createDrizzleDatabaseFromD1(d1)
    // The whole reason the rebuild is unavoidable: google_sub was NOT NULL
    // UNIQUE, and Better Auth inserts email/password users without one.
    await database
      .insert(schema.users)
      .values({ id: 'user-credential', email: 'new@example.com', displayName: 'New User' })
      .run()

    const created = await database
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, 'user-credential'))
      .get()
    expect(created?.googleSub).toBeNull()
    expect(created?.role).toBe('user')
  }, 30_000)
})
