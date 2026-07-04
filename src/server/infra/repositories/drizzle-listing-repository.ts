import { and, eq } from 'drizzle-orm'
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
  }): Promise<ListingAggregate[]> {
    const listingRows = await db.select().from(schema.listings).all()
    const filteredListings = listingRows.filter((listing) => {
      if (input?.listingId && listing.id !== input.listingId) {
        return false
      }

      if (input?.slug && listing.slug !== input.slug) {
        return false
      }

      if (input?.species && listing.species !== input.species) {
        return false
      }

      return true
    })

    const aggregates: ListingAggregate[] = []
    const savedListingIds = input?.viewerId ? await getSavedListingIds(input.viewerId) : new Set<string>()

    for (const listing of filteredListings) {
      const [imageRows, tagRows, organizationRows, userRows] = await Promise.all([
        db
          .select()
          .from(schema.listingImages)
          .where(eq(schema.listingImages.listingId, listing.id))
          .all(),
        db
          .select({
            id: schema.tags.id,
            slug: schema.tags.slug,
            label: schema.tags.label,
            speciesScope: schema.tags.speciesScope,
            createdAt: schema.tags.createdAt,
          })
          .from(schema.listingTagAssignments)
          .innerJoin(schema.tags, eq(schema.listingTagAssignments.tagId, schema.tags.id))
          .where(eq(schema.listingTagAssignments.listingId, listing.id))
          .all(),
        listing.organizationId
          ? db.select().from(schema.organizations).where(eq(schema.organizations.id, listing.organizationId)).all()
          : Promise.resolve([]),
        listing.listedByUserId ? db.select().from(schema.users).where(eq(schema.users.id, listing.listedByUserId)).all() : Promise.resolve([]),
      ])

      aggregates.push({
        listing: toListingRecord(listing),
        images: imageRows.map(toListingImageRecord).sort((left, right) => left.sortOrder - right.sortOrder),
        tags: tagRows.map(toTagRecord),
        organization: organizationRows[0] ? toOrganizationRecord(organizationRows[0]) : null,
        listedByUser: userRows[0] ? toUserRecord(userRows[0]) : null,
        savedByViewer: savedListingIds.has(listing.id),
      })
    }

    return aggregates
  }

  async function getSavedListingIds(viewerId: string): Promise<Set<string>> {
    const rows = await db.select().from(schema.savedListings).where(eq(schema.savedListings.userId, viewerId)).all()
    return new Set(rows.map((row) => row.listingId))
  }

  async function upsertAggregateDependencies(aggregate: ListingAggregate): Promise<void> {
    if (aggregate.listedByUser) {
      await db
        .insert(schema.users)
        .values(toUserInsert(aggregate.listedByUser))
        .onConflictDoUpdate({
          target: schema.users.id,
          set: toUserInsert(aggregate.listedByUser),
        })
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

    const saved = await loadAggregates({ listingId: aggregate.listing.id })
    return saved[0] ?? aggregate
  }

  return {
    browse(query) {
      return loadAggregates({ species: query.species })
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
