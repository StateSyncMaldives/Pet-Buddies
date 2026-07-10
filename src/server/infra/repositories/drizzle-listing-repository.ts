import { and, eq, inArray, sql } from 'drizzle-orm'
import type { drizzle } from 'drizzle-orm/d1'

import type {
  ListingImageRecord,
  ListingRecord,
  OrganizationRecord,
  TagRecord,
  UserRecord,
} from '../../../../backend/contracts'
import type { ListingAggregate } from '../../domain/listings/listing-mapper'
import type { AsyncListingRepository, ToggleSavedListingInput } from '../../domain/listings/listing-repository'
import type { BrowseListingsQuery } from '../../contracts/api'
import * as schema from '../db/schema'

type PetBuddiesDb = ReturnType<typeof drizzle<typeof schema>>

export function createDrizzleListingRepository(input: { db: PetBuddiesDb }): AsyncListingRepository {
  const db = input.db

  async function loadAggregates(input?: {
    listingId?: string
    slug?: string
    species?: BrowseListingsQuery['species']
    viewerId?: string
    /** Browse-only: restrict to live listings. */
    onlyLive?: boolean
    /** Browse-only: keep only listings carrying every one of these tag slugs (AND). */
    tagSlugs?: string[]
  }): Promise<ListingAggregate[]> {
    // Push the primary access-pattern predicates (id / slug / species / status)
    // and tag-set membership into SQL so key lookups and browse use the indexes
    // instead of scanning every listing. See ADR 0008.
    const conditions = []
    if (input?.listingId) conditions.push(eq(schema.listings.id, input.listingId))
    if (input?.slug) conditions.push(eq(schema.listings.slug, input.slug))
    if (input?.species) conditions.push(eq(schema.listings.species, input.species))
    if (input?.onlyLive) conditions.push(eq(schema.listings.status, 'live'))

    const tagSlugs = input?.tagSlugs?.length ? [...new Set(input.tagSlugs)] : []
    if (tagSlugs.length) {
      // Relational division: a listing qualifies only when it is assigned all of
      // the requested tag slugs. Counting distinct matched slugs === the request
      // size enforces AND-membership in a single indexed subquery.
      const listingsWithAllTags = db
        .select({ listingId: schema.listingTagAssignments.listingId })
        .from(schema.listingTagAssignments)
        .innerJoin(schema.tags, eq(schema.listingTagAssignments.tagId, schema.tags.id))
        .where(inArray(schema.tags.slug, tagSlugs))
        .groupBy(schema.listingTagAssignments.listingId)
        .having(sql`count(distinct ${schema.tags.slug}) = ${tagSlugs.length}`)
      conditions.push(inArray(schema.listings.id, listingsWithAllTags))
    }

    const filteredListings = conditions.length
      ? await db.select().from(schema.listings).where(and(...conditions)).all()
      : await db.select().from(schema.listings).all()

    if (filteredListings.length === 0) return []

    // Batch-load every related row for the whole result set in a fixed number of
    // queries (instead of four per listing) and assemble in memory. See #9.
    const listingIds = filteredListings.map((listing) => listing.id)
    const organizationIds = [...new Set(filteredListings.map((l) => l.organizationId).filter((id): id is string => !!id))]
    const userIds = [...new Set(filteredListings.map((l) => l.listedByUserId).filter((id): id is string => !!id))]

    const [imageRows, tagRows, organizationRows, userRows, savedListingIds] = await Promise.all([
      db.select().from(schema.listingImages).where(inArray(schema.listingImages.listingId, listingIds)).all(),
      db
        .select({
          listingId: schema.listingTagAssignments.listingId,
          id: schema.tags.id,
          slug: schema.tags.slug,
          label: schema.tags.label,
          speciesScope: schema.tags.speciesScope,
          createdAt: schema.tags.createdAt,
        })
        .from(schema.listingTagAssignments)
        .innerJoin(schema.tags, eq(schema.listingTagAssignments.tagId, schema.tags.id))
        .where(inArray(schema.listingTagAssignments.listingId, listingIds))
        .all(),
      organizationIds.length
        ? db.select().from(schema.organizations).where(inArray(schema.organizations.id, organizationIds)).all()
        : Promise.resolve([]),
      userIds.length ? db.select().from(schema.users).where(inArray(schema.users.id, userIds)).all() : Promise.resolve([]),
      input?.viewerId ? getSavedListingIds(input.viewerId) : Promise.resolve(new Set<string>()),
    ])

    const imagesByListing = groupBy(imageRows, (row) => row.listingId)
    const tagsByListing = groupBy(tagRows, (row) => row.listingId)
    const organizationById = new Map(organizationRows.map((row) => [row.id, row]))
    const userById = new Map(userRows.map((row) => [row.id, row]))

    return filteredListings.map((listing) => ({
      listing: toListingRecord(listing),
      images: (imagesByListing.get(listing.id) ?? [])
        .map(toListingImageRecord)
        .sort((left, right) => left.sortOrder - right.sortOrder),
      tags: (tagsByListing.get(listing.id) ?? []).map(toTagRecord),
      organization: listing.organizationId ? toOrganizationRecordOrNull(organizationById.get(listing.organizationId)) : null,
      listedByUser: listing.listedByUserId ? toUserRecordOrNull(userById.get(listing.listedByUserId)) : null,
      savedByViewer: savedListingIds.has(listing.id),
    }))
  }

  async function getSavedListingIds(viewerId: string): Promise<Set<string>> {
    const rows = await db.select().from(schema.savedListings).where(eq(schema.savedListings.userId, viewerId)).all()
    return new Set(rows.map((row) => row.listingId))
  }

  async function upsertAggregateDependencies(aggregate: ListingAggregate): Promise<void> {
    if (aggregate.listedByUser) {
      // A listing write must never overwrite an existing user's profile — the
      // create use-case fabricates a synthetic owner record from the actor id,
      // so upsert-overwriting would clobber the durably-seeded viewer. Insert
      // only when the user is new.
      await db
        .insert(schema.users)
        .values(toUserInsert(aggregate.listedByUser))
        .onConflictDoNothing({ target: schema.users.id })
        .run()
    }

    if (aggregate.organization) {
      await db
        .insert(schema.organizations)
        .values(toOrganizationInsert(aggregate.organization))
        .onConflictDoUpdate({
          target: schema.organizations.id,
          set: toOrganizationInsert(aggregate.organization),
        })
        .run()
    }

    for (const tag of aggregate.tags) {
      await db
        .insert(schema.tags)
        .values(toTagInsert(tag))
        .onConflictDoUpdate({
          target: schema.tags.id,
          set: toTagInsert(tag),
        })
        .run()
    }
  }

  async function saveAggregate(aggregate: ListingAggregate): Promise<ListingAggregate> {
    await upsertAggregateDependencies(aggregate)

    await db
      .insert(schema.listings)
      .values(toListingInsert(aggregate.listing))
      .onConflictDoUpdate({
        target: schema.listings.id,
        set: toListingInsert(aggregate.listing),
      })
      .run()

    await db.delete(schema.listingImages).where(eq(schema.listingImages.listingId, aggregate.listing.id)).run()
    for (const image of aggregate.images) {
      await db.insert(schema.listingImages).values(toListingImageInsert(image)).run()
    }

    await db
      .delete(schema.listingTagAssignments)
      .where(eq(schema.listingTagAssignments.listingId, aggregate.listing.id))
      .run()
    for (const tag of aggregate.tags) {
      await db
        .insert(schema.listingTagAssignments)
        .values({
          listingId: aggregate.listing.id,
          tagId: tag.id,
          createdAt: tag.createdAt,
        })
        .run()
    }

    // Read back the persisted aggregate so the return reflects true D1 state,
    // not the input: a create fabricates a synthetic owner record, but the user
    // upsert is onConflictDoNothing, so the row that survives is the existing
    // (seeded) profile. Returning the input here would report the wrong owner.
    const saved = await loadAggregates({ listingId: aggregate.listing.id })
    return saved[0] ?? aggregate
  }

  return {
    browse(query) {
      // Species, live-status, and tag-set membership are resolved in SQL; the
      // listing-service still applies the free-text search over this narrowed
      // set (its joined-haystack semantics, incl. tag labels, have no strict
      // SQL equivalent, so keeping it in-service preserves exact parity). See #10.
      return loadAggregates({ species: query.species, onlyLive: true, tagSlugs: query.tagSlugs })
    },
    listAll(viewerId) {
      return loadAggregates({ viewerId })
    },
    async getById(id) {
      return (await loadAggregates({ listingId: id }))[0] ?? null
    },
    async getBySlug(slug) {
      return (await loadAggregates({ slug }))[0] ?? null
    },
    create(aggregate) {
      return saveAggregate(aggregate)
    },
    save(aggregate) {
      return saveAggregate(aggregate)
    },
    async updateStatus(id, status) {
      await db.update(schema.listings).set({ status }).where(eq(schema.listings.id, id)).run()
      return (await loadAggregates({ listingId: id }))[0] ?? null
    },
    async toggleSavedListing(input: ToggleSavedListingInput) {
      const existing = await db
        .select()
        .from(schema.savedListings)
        .where(and(eq(schema.savedListings.userId, input.viewerId), eq(schema.savedListings.listingId, input.listingId)))
        .all()

      if (existing.length > 0) {
        await db
          .delete(schema.savedListings)
          .where(and(eq(schema.savedListings.userId, input.viewerId), eq(schema.savedListings.listingId, input.listingId)))
          .run()
        return false
      }

      await db
        .insert(schema.savedListings)
        .values({
          userId: input.viewerId,
          listingId: input.listingId,
        })
        .run()
      return true
    },
  }
}

/**
 * Bulk-inserts seed aggregates in a single D1 batch, skipping rows that already
 * exist (idempotent) and never reading anything back — much cheaper than
 * calling create() per aggregate, which re-scans on every write. Insert order
 * satisfies the foreign keys: owners/organizations and tags precede listings,
 * and listings precede their images and tag assignments.
 */
export async function seedListingAggregates(db: PetBuddiesDb, aggregates: ListingAggregate[]): Promise<void> {
  const users = new Map<string, ReturnType<typeof toUserInsert>>()
  const organizations = new Map<string, ReturnType<typeof toOrganizationInsert>>()
  const tags = new Map<string, ReturnType<typeof toTagInsert>>()

  for (const aggregate of aggregates) {
    if (aggregate.listedByUser) users.set(aggregate.listedByUser.id, toUserInsert(aggregate.listedByUser))
    if (aggregate.organization) organizations.set(aggregate.organization.id, toOrganizationInsert(aggregate.organization))
    for (const tag of aggregate.tags) tags.set(tag.id, toTagInsert(tag))
  }

  const statements = [
    ...Array.from(users.values()).map((user) => db.insert(schema.users).values(user).onConflictDoNothing()),
    ...Array.from(organizations.values()).map((org) => db.insert(schema.organizations).values(org).onConflictDoNothing()),
    ...Array.from(tags.values()).map((tag) => db.insert(schema.tags).values(tag).onConflictDoNothing()),
    ...aggregates.map((aggregate) => db.insert(schema.listings).values(toListingInsert(aggregate.listing)).onConflictDoNothing()),
    ...aggregates.flatMap((aggregate) =>
      aggregate.images.map((image) => db.insert(schema.listingImages).values(toListingImageInsert(image)).onConflictDoNothing()),
    ),
    ...aggregates.flatMap((aggregate) =>
      aggregate.tags.map((tag) =>
        db
          .insert(schema.listingTagAssignments)
          .values({ listingId: aggregate.listing.id, tagId: tag.id, createdAt: tag.createdAt })
          .onConflictDoNothing(),
      ),
    ),
  ]

  if (statements.length === 0) return
  await db.batch(statements as unknown as Parameters<typeof db.batch>[0])
}

function groupBy<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>()
  for (const item of items) {
    const k = key(item)
    const bucket = map.get(k)
    if (bucket) bucket.push(item)
    else map.set(k, [item])
  }
  return map
}

function toOrganizationRecordOrNull(
  row: typeof schema.organizations.$inferSelect | undefined,
): OrganizationRecord | null {
  return row ? toOrganizationRecord(row) : null
}

function toUserRecordOrNull(row: typeof schema.users.$inferSelect | undefined): UserRecord | null {
  return row ? toUserRecord(row) : null
}

function toListingRecord(row: typeof schema.listings.$inferSelect): ListingRecord {
  return {
    id: row.id,
    slug: row.slug,
    species: row.species,
    birdSpecies: row.birdSpecies,
    name: row.name,
    ageText: row.ageText,
    sex: row.sex,
    areaLabel: row.areaLabel,
    story: row.story,
    status: row.status,
    listedByUserId: row.listedByUserId,
    organizationId: row.organizationId,
    publishedAt: row.publishedAt,
    adoptedAt: row.adoptedAt,
    rejectedAt: row.rejectedAt,
    rejectedReason: row.rejectedReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toListingInsert(record: ListingRecord): typeof schema.listings.$inferInsert {
  return {
    id: record.id,
    slug: record.slug,
    species: record.species,
    birdSpecies: record.birdSpecies,
    name: record.name,
    ageText: record.ageText,
    sex: record.sex,
    areaLabel: record.areaLabel,
    story: record.story,
    status: record.status,
    listedByUserId: record.listedByUserId,
    organizationId: record.organizationId,
    publishedAt: record.publishedAt,
    adoptedAt: record.adoptedAt,
    rejectedAt: record.rejectedAt,
    rejectedReason: record.rejectedReason,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

function toListingImageRecord(row: typeof schema.listingImages.$inferSelect): ListingImageRecord {
  return {
    id: row.id,
    listingId: row.listingId,
    objectKey: row.objectKey,
    publicUrl: row.publicUrl,
    sortOrder: row.sortOrder,
    width: row.width,
    height: row.height,
    createdAt: row.createdAt,
  }
}

function toListingImageInsert(record: ListingImageRecord): typeof schema.listingImages.$inferInsert {
  return {
    id: record.id,
    listingId: record.listingId,
    objectKey: record.objectKey,
    publicUrl: record.publicUrl,
    sortOrder: record.sortOrder,
    width: record.width,
    height: record.height,
    createdAt: record.createdAt,
  }
}

function toTagRecord(row: typeof schema.tags.$inferSelect): TagRecord {
  return {
    id: row.id,
    slug: row.slug,
    label: row.label,
    speciesScope: row.speciesScope,
    createdAt: row.createdAt,
  }
}

function toTagInsert(record: TagRecord): typeof schema.tags.$inferInsert {
  return {
    id: record.id,
    slug: record.slug,
    label: record.label,
    speciesScope: record.speciesScope,
    createdAt: record.createdAt,
  }
}

function toOrganizationRecord(row: typeof schema.organizations.$inferSelect): OrganizationRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    kind: row.kind,
    description: row.description,
    areaLabel: row.areaLabel,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    isVerified: row.isVerified,
    verifiedAt: row.verifiedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toOrganizationInsert(record: OrganizationRecord): typeof schema.organizations.$inferInsert {
  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
    kind: record.kind,
    description: record.description,
    areaLabel: record.areaLabel,
    contactEmail: record.contactEmail,
    contactPhone: record.contactPhone,
    isVerified: record.isVerified,
    verifiedAt: record.verifiedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

function toUserRecord(row: typeof schema.users.$inferSelect): UserRecord {
  return {
    id: row.id,
    googleSub: row.googleSub,
    email: row.email,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    globalRole: row.globalRole,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toUserInsert(record: UserRecord): typeof schema.users.$inferInsert {
  return {
    id: record.id,
    googleSub: record.googleSub,
    email: record.email,
    displayName: record.displayName,
    avatarUrl: record.avatarUrl,
    globalRole: record.globalRole,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}
