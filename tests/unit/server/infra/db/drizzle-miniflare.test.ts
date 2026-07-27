import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'

import { createD1MigrationClient } from '../../../../../src/server/infra/db/client'
import { applyDbMigrations, getDbMigrations } from '../../../../../src/server/infra/db/migrate'
import * as schema from '../../../../../src/server/infra/db/schema'
import { useMiniflareD1 } from '../../../../helpers/miniflare-d1'

const expectedTableNames = [
  'account',
  'adoption_inquiries',
  'clinic_services',
  'clinics',
  'listing_images',
  'listing_tag_assignments',
  'listings',
  'lost_found_reports',
  'moderation_events',
  'organization_members',
  'organizations',
  'saved_listings',
  'session',
  'tags',
  'users',
  'verification',
]

// These tests exercise migration application themselves, so the helper must
// hand back a pristine database.
const createMiniflareD1 = useMiniflareD1('pet-buddies-test-db', { applyMigrations: false })

describe('Drizzle D1 setup', () => {
  it('applies the canonical migrations to a Miniflare D1 database', async () => {
    const { d1 } = await createMiniflareD1()

    await applyDbMigrations(createD1MigrationClient(d1), getDbMigrations())

    const result = await d1
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE '_cf_%' ORDER BY name",
      )
      .all<{ name: string }>()

    const rows = result.results as Array<{ name: string }>

    expect(rows.map((row) => row.name)).toEqual(expectedTableNames)
  }, 15_000)

  it('maps every canonical table through Drizzle against Miniflare D1', async () => {
    const { d1, db } = await createMiniflareD1()
    await applyDbMigrations(createD1MigrationClient(d1), getDbMigrations())

    await db
      .insert(schema.users)
      .values({
        id: 'user-1',
        googleSub: 'google-user-1',
        email: 'user@example.com',
        displayName: 'Asha',
      })
      .run()
    await db
      .insert(schema.organizations)
      .values({
        id: 'org-1',
        slug: 'happy-paws',
        name: 'Happy Paws',
        isVerified: true,
      })
      .run()
    await db
      .insert(schema.organizationMembers)
      .values({ organizationId: 'org-1', userId: 'user-1', role: 'admin' })
      .run()
    await db
      .insert(schema.tags)
      .values({ id: 'tag-1', slug: 'gentle', label: 'Gentle' })
      .run()
    await db
      .insert(schema.listings)
      .values({
        id: 'listing-1',
        slug: 'miso',
        species: 'cat',
        name: 'Miso',
        ageText: '2 years',
        areaLabel: 'Tampines',
        story: 'Quiet indoor cat looking for a calm home.',
        status: 'live',
        listedByUserId: 'user-1',
        organizationId: 'org-1',
      })
      .run()
    await db
      .insert(schema.listingImages)
      .values({
        id: 'image-1',
        listingId: 'listing-1',
        objectKey: 'listings/miso.jpg',
        sortOrder: 1,
        width: 1200,
        height: 800,
      })
      .run()
    await db
      .insert(schema.listingTagAssignments)
      .values({ listingId: 'listing-1', tagId: 'tag-1' })
      .run()
    await db
      .insert(schema.savedListings)
      .values({ userId: 'user-1', listingId: 'listing-1' })
      .run()
    await db
      .insert(schema.adoptionInquiries)
      .values({
        id: 'inquiry-1',
        listingId: 'listing-1',
        senderUserId: 'user-1',
        recipientOrganizationId: 'org-1',
        recipientDisplayNameSnapshot: 'Happy Paws',
        listingNameSnapshot: 'Miso',
        message: 'Can we meet Miso?',
      })
      .run()
    await db
      .insert(schema.lostFoundReports)
      .values({
        id: 'report-1',
        referenceCode: 'LF-0001',
        reportKind: 'lost',
        species: 'cat',
        reporterUserId: 'user-1',
        areaLabel: 'Bedok',
        description: 'Small tabby last seen near the MRT.',
        routedToOrganizationId: 'org-1',
      })
      .run()
    await db
      .insert(schema.clinics)
      .values({
        id: 'clinic-1',
        slug: 'east-vet',
        name: 'East Vet',
        areaLabel: 'Bedok',
      })
      .run()
    await db
      .insert(schema.clinicServices)
      .values({ clinicId: 'clinic-1', serviceName: 'Sterilisation' })
      .run()
    await db
      .insert(schema.moderationEvents)
      .values({
        id: 'event-1',
        listingId: 'listing-1',
        actorUserId: 'user-1',
        action: 'approved',
      })
      .run()

    const listingRows = await db
      .select({ id: schema.listings.id, slug: schema.listings.slug })
      .from(schema.listings)
      .where(eq(schema.listings.id, 'listing-1'))
      .all()
    const clinicServiceRows = await db
      .select({ serviceName: schema.clinicServices.serviceName })
      .from(schema.clinicServices)
      .all()

    expect(listingRows).toEqual([{ id: 'listing-1', slug: 'miso' }])
    expect(clinicServiceRows).toEqual([{ serviceName: 'Sterilisation' }])
  }, 15_000)
})
