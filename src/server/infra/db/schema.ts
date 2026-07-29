import { sql } from 'drizzle-orm'
import { check, index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

const timestamps = {
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}

// Better Auth's drizzle adapter always passes native JS `Date` objects for
// every `type:"date"` field (createdAt, updatedAt, expiresAt, token
// expiries, banExpires) and never sets `supportsDates:false` for the sqlite
// provider — so these four tables (owned/written by Better Auth) use
// integer/timestamp columns, not the shared `text` `timestamps` helper.
// Every OTHER table in this file keeps text CURRENT_TIMESTAMP columns; the
// app (not Better Auth) owns those and reads/writes them as ISO strings.
const betterAuthTimestamps = {
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
}

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    googleSub: text('google_sub'), // legacy, nullable — provider identity now in `account`
    email: text('email').notNull(),
    emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
    displayName: text('display_name').notNull(),
    avatarUrl: text('avatar_url'),
    role: text('role', { enum: ['user', 'moderator', 'admin'] }).notNull().default('user'),
    banned: integer('banned', { mode: 'boolean' }).notNull().default(false),
    banReason: text('ban_reason'),
    banExpires: integer('ban_expires', { mode: 'timestamp' }),
    ...betterAuthTimestamps,
  },
  (table) => [
    uniqueIndex('users_email_unique').on(table.email),
    check('users_role_check', sql`${table.role} in ('user', 'moderator', 'admin')`),
  ],
)

export const session = sqliteTable(
  'session',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    impersonatedBy: text('impersonated_by'),
    ...betterAuthTimestamps,
  },
  (table) => [uniqueIndex('session_token_unique').on(table.token)],
)

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
  scope: text('scope'),
  password: text('password'),
  ...betterAuthTimestamps,
})

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  ...betterAuthTimestamps,
})

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
    check('organizations_kind_check', sql`${table.kind} in ('rescue', 'ngo', 'partner', 'community')`),
    check('organizations_is_verified_check', sql`${table.isVerified} in (0, 1)`),
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
    check('organization_members_role_check', sql`${table.role} in ('member', 'admin', 'listing_manager')`),
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
    check('tags_species_scope_check', sql`${table.speciesScope} in ('cat', 'bird', 'both')`),
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
    check('listings_species_check', sql`${table.species} in ('cat', 'bird')`),
    check('listings_sex_check', sql`${table.sex} in ('male', 'female', 'unknown')`),
    check('listings_status_check', sql`${table.status} in ('pending', 'live', 'rejected', 'adopted')`),
    check(
      'listings_bird_species_check',
      sql`(${table.species} = 'bird' and ${table.birdSpecies} in ('Budgerigar', 'Cockatiel', 'Lovebird', 'Finch', 'Canary')) or (${table.species} = 'cat' and ${table.birdSpecies} is null)`,
    ),
    check('listings_owner_check', sql`${table.organizationId} is not null or ${table.listedByUserId} is not null`),
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
    check(
      'adoption_inquiries_status_check',
      sql`${table.status} in ('awaiting_reply', 'replied', 'withdrawn', 'closed')`,
    ),
    check(
      'adoption_inquiries_recipient_check',
      sql`${table.recipientUserId} is not null or ${table.recipientOrganizationId} is not null`,
    ),
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
    check('lost_found_reports_report_kind_check', sql`${table.reportKind} in ('lost', 'found')`),
    check('lost_found_reports_species_check', sql`${table.species} in ('cat', 'bird')`),
    check(
      'lost_found_reports_status_check',
      sql`${table.status} in ('submitted', 'reviewing', 'resolved', 'closed')`,
    ),
    check(
      'lost_found_reports_bird_species_check',
      sql`(${table.species} = 'bird' and ${table.birdSpecies} in ('Budgerigar', 'Cockatiel', 'Lovebird', 'Finch', 'Canary')) or (${table.species} = 'cat' and ${table.birdSpecies} is null)`,
    ),
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
    check('clinics_is_active_check', sql`${table.isActive} in (0, 1)`),
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
  (table) => [
    index('idx_moderation_events_listing_created').on(table.listingId, table.createdAt),
    check(
      'moderation_events_action_check',
      sql`${table.action} in ('submitted', 'approved', 'rejected', 'adopted', 'restored')`,
    ),
  ],
)
