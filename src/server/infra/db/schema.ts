import { sql } from 'drizzle-orm'
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

const timestamps = {
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    googleSub: text('google_sub').notNull(),
    email: text('email').notNull(),
    displayName: text('display_name').notNull(),
    avatarUrl: text('avatar_url'),
    globalRole: text('global_role', { enum: ['user', 'moderator', 'admin'] }).notNull().default('user'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('users_google_sub_unique').on(table.googleSub),
    uniqueIndex('users_email_unique').on(table.email),
  ],
)

export const organizations = sqliteTable(
  'organizations',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    kind: text('kind', { enum: ['rescue', 'ngo', 'partner', 'community'] }).notNull().default('rescue'),
    description: text('description'),
    areaLabel: text('area_label'),
    contactEmail: text('contact_email'),
    contactPhone: text('contact_phone'),
    isVerified: integer('is_verified', { mode: 'boolean' }).notNull().default(false),
    verifiedAt: text('verified_at'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('organizations_slug_unique').on(table.slug),
    uniqueIndex('organizations_name_unique').on(table.name),
  ],
)

export const organizationMembers = sqliteTable(
  'organization_members',
  {
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['member', 'admin', 'listing_manager'] }).notNull().default('member'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.userId] }),
    index('idx_organization_members_user').on(table.userId),
  ],
)

export const tags = sqliteTable(
  'tags',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    label: text('label').notNull(),
    speciesScope: text('species_scope', { enum: ['cat', 'bird', 'both'] }).notNull().default('both'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex('tags_slug_unique').on(table.slug),
    uniqueIndex('tags_label_unique').on(table.label),
    index('idx_tags_species_scope').on(table.speciesScope),
  ],
)

export const listings = sqliteTable(
  'listings',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    species: text('species', { enum: ['cat', 'bird'] }).notNull(),
    birdSpecies: text('bird_species', {
      enum: ['Budgerigar', 'Cockatiel', 'Lovebird', 'Finch', 'Canary'],
    }),
    name: text('name').notNull(),
    ageText: text('age_text').notNull(),
    sex: text('sex', { enum: ['male', 'female', 'unknown'] }).notNull().default('unknown'),
    areaLabel: text('area_label').notNull(),
    story: text('story').notNull(),
    status: text('status', { enum: ['pending', 'live', 'rejected', 'adopted'] }).notNull().default('pending'),
    listedByUserId: text('listed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    organizationId: text('organization_id').references(() => organizations.id, { onDelete: 'set null' }),
    publishedAt: text('published_at'),
    adoptedAt: text('adopted_at'),
    rejectedAt: text('rejected_at'),
    rejectedReason: text('rejected_reason'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('listings_slug_unique').on(table.slug),
    index('idx_listings_status_species_created').on(table.status, table.species, table.createdAt),
    index('idx_listings_listed_by_user').on(table.listedByUserId, table.status, table.createdAt),
    index('idx_listings_organization').on(table.organizationId, table.status, table.createdAt),
    index('idx_listings_area_label').on(table.areaLabel),
  ],
)

export const listingImages = sqliteTable(
  'listing_images',
  {
    id: text('id').primaryKey(),
    listingId: text('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    objectKey: text('object_key').notNull(),
    publicUrl: text('public_url'),
    sortOrder: integer('sort_order').notNull().default(0),
    width: integer('width'),
    height: integer('height'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index('idx_listing_images_listing').on(table.listingId, table.sortOrder)],
)

export const listingTagAssignments = sqliteTable(
  'listing_tag_assignments',
  {
    listingId: text('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    primaryKey({ columns: [table.listingId, table.tagId] }),
    index('idx_listing_tag_assignments_tag').on(table.tagId, table.listingId),
  ],
)

export const savedListings = sqliteTable(
  'saved_listings',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    listingId: text('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.listingId] }),
    index('idx_saved_listings_user_created').on(table.userId, table.createdAt),
  ],
)

export const adoptionInquiries = sqliteTable(
  'adoption_inquiries',
  {
    id: text('id').primaryKey(),
    listingId: text('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    senderUserId: text('sender_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    recipientUserId: text('recipient_user_id').references(() => users.id, { onDelete: 'set null' }),
    recipientOrganizationId: text('recipient_organization_id').references(() => organizations.id, {
      onDelete: 'set null',
    }),
    recipientDisplayNameSnapshot: text('recipient_display_name_snapshot').notNull(),
    listingNameSnapshot: text('listing_name_snapshot').notNull(),
    message: text('message').notNull(),
    status: text('status', { enum: ['awaiting_reply', 'replied', 'withdrawn', 'closed'] })
      .notNull()
      .default('awaiting_reply'),
    ...timestamps,
  },
  (table) => [
    index('idx_adoption_inquiries_sender_created').on(table.senderUserId, table.createdAt),
    index('idx_adoption_inquiries_recipient_user_created').on(table.recipientUserId, table.createdAt),
    index('idx_adoption_inquiries_recipient_org_created').on(table.recipientOrganizationId, table.createdAt),
  ],
)

export const lostFoundReports = sqliteTable(
  'lost_found_reports',
  {
    id: text('id').primaryKey(),
    referenceCode: text('reference_code').notNull(),
    reportKind: text('report_kind', { enum: ['lost', 'found'] }).notNull(),
    species: text('species', { enum: ['cat', 'bird'] }).notNull(),
    birdSpecies: text('bird_species', {
      enum: ['Budgerigar', 'Cockatiel', 'Lovebird', 'Finch', 'Canary'],
    }),
    reporterUserId: text('reporter_user_id').references(() => users.id, { onDelete: 'set null' }),
    reporterName: text('reporter_name'),
    reporterEmail: text('reporter_email'),
    areaLabel: text('area_label').notNull(),
    description: text('description').notNull(),
    photoObjectKey: text('photo_object_key'),
    routedToOrganizationId: text('routed_to_organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    status: text('status', { enum: ['submitted', 'reviewing', 'resolved', 'closed'] })
      .notNull()
      .default('submitted'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('lost_found_reports_reference_code_unique').on(table.referenceCode),
    index('idx_lost_found_reports_routed_status_created').on(
      table.routedToOrganizationId,
      table.status,
      table.createdAt,
    ),
    index('idx_lost_found_reports_status_created').on(table.status, table.createdAt),
  ],
)

export const clinics = sqliteTable(
  'clinics',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    areaLabel: text('area_label').notNull(),
    address: text('address'),
    phone: text('phone'),
    note: text('note'),
    mapsUrl: text('maps_url'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('clinics_slug_unique').on(table.slug),
    uniqueIndex('clinics_name_unique').on(table.name),
  ],
)

export const clinicServices = sqliteTable(
  'clinic_services',
  {
    clinicId: text('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'cascade' }),
    serviceName: text('service_name').notNull(),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [primaryKey({ columns: [table.clinicId, table.serviceName] })],
)

export const moderationEvents = sqliteTable(
  'moderation_events',
  {
    id: text('id').primaryKey(),
    listingId: text('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    actorUserId: text('actor_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    action: text('action', { enum: ['submitted', 'approved', 'rejected', 'adopted', 'restored'] }).notNull(),
    reason: text('reason'),
    metadataJson: text('metadata_json'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index('idx_moderation_events_listing_created').on(table.listingId, table.createdAt)],
)
