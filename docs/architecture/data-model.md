# Pet Buddies backend data model

## Status
Backend data model for the Pet Buddies fullstack migration. Originally drafted as the backend foundation; the stack below is now decided and wired in the codebase.

## Stack
- **frontend/fullstack framework:** TanStack Start (wired)
- **deployment:** Cloudflare Workers (deployed; live at https://pet-buddies.statesync.dev)
- **database:** relational SQL, **D1-compatible** (Drizzle schema + Miniflare-tested D1 repositories; durable runtime composition still pending)
- **file storage:** R2 for listing/report images (implemented; see ADR 0005–0007)
- **auth:** Better Auth over D1 — Google OAuth + email/password, with role-based access control (wired; the demo Viewer identity is gone). See [ADR 0010](../adr/0010-better-auth-over-d1-adapt-existing-users.md)

If we later switch to external Postgres, the domain model still holds; only the SQL dialect and migration tooling need to change.

---

## What the current app already proves
From the existing prototype code and README, the backend must support these workflows:

1. **Browse live adoptable listings** for cats and birds
2. **View listing details** with org/lister attribution
3. **Save listings** without losing user history
4. **Submit adoption inquiries**
5. **Create new listings** as an authenticated user
6. **Moderate pending listings**
7. **Mark listings as adopted**
8. **Submit lost/found reports**
9. **Show vet clinics**
10. **Support verified organizations** separately from individual listers

---

## Main design choices

### 1) Model the domain, not the current UI state
The current React store keeps arrays and UI flags in memory. The backend should instead center on persistent domain entities:
- users
- organizations
- listings
- inquiries
- reports
- clinics
- moderation events

### 2) Use relational modeling for integrity
This product has strong relationships:
- a listing belongs to either a user or an organization
- a listing has many images
- a listing has many tags
- a user can save many listings
- a listing receives many inquiries
- a listing gets many moderation events

That strongly favors SQL over document storage.

### 3) Keep the MVP flexible but not overbuilt
For the first version:
- keep `area_label` as text
- keep `age_text` as text
- avoid premature geospatial normalization
- avoid chat/messaging systems inside the product
- store display snapshots where history should survive later profile changes

---

## Entities

## users
Represents any authenticated person.

Needed for:
- listing creation
- inquiry sending
- saved listings
- moderation actions
- org membership

Key fields:
- `id`
- `google_sub` — legacy and nullable; provider identity lives in `account` (ADR 0010)
- `email`
- `email_verified`
- `display_name`
- `avatar_url`
- `role` — the global role (renamed from `global_role` in ADR 0010)
- `banned`, `ban_reason`, `ban_expires`

Better Auth adds `session`, `account` and `verification` alongside this table; the
`users` table itself is adapted rather than duplicated, so every existing foreign
key still points at it. See [ADR 0010](../adr/0010-better-auth-over-d1-adapt-existing-users.md).

---

## organizations
Represents verified rescue partners or similar entities.

Needed for:
- verified-org listings
- routing lost/found reports
- attribution on listing cards/details

Key fields:
- `id`
- `slug`
- `name`
- `kind`
- `description`
- `area_label`
- `contact_email`
- `contact_phone`
- `is_verified`
- `verified_at`

---

## organization_members
Maps users into organizations.

Needed for:
- org admins creating listings on behalf of an org
- future moderation/report-routing workflows

Key fields:
- `organization_id`
- `user_id`
- `role`

---

## tags
Canonical tag definitions for browse filters and listing metadata.

Examples:
- Vaccinated
- Hand-tame
- Needs foster
- Bonded pair
- Kitten
- Neutered
- Litter-trained

---

## listings
The core adoptable pet record.

Key rules:
- belongs to either a user or an organization
- status lifecycle: `pending -> live -> adopted` or `pending -> rejected`
- birds may require a legal-species allowlist value

Key fields:
- `id`
- `slug`
- `species`
- `bird_species`
- `name`
- `age_text`
- `sex`
- `area_label`
- `story`
- `status`
- `listed_by_user_id`
- `organization_id`
- `published_at`
- `adopted_at`
- `rejected_at`
- `rejected_reason`

---

## listing_images
Photo metadata for a listing.

Needed because production listings/reports need uploaded photos rather than placeholder URLs.

Key fields:
- `id`
- `listing_id`
- `object_key`
- `public_url`
- `sort_order`
- `width`
- `height`

---

## listing_tag_assignments
Join table between listings and tags.

Needed for:
- browse filtering
- future faceting
- normalized tag governance

---

## saved_listings
Join table for a user saving a listing.

Needed for:
- Saved tab
- future notification or recommendation logic

---

## adoption_inquiries
An application/inquiry sent by a user about a listing.

Key design choice:
Store recipient and listing snapshots needed for historical display even if the listing or profile later changes.

Key fields:
- `id`
- `listing_id`
- `sender_user_id`
- `recipient_user_id`
- `recipient_organization_id`
- `recipient_display_name_snapshot`
- `message`
- `status`

---

## lost_found_reports
Anonymous or authenticated report submission.

Important product rule from the prototype:
- cats route to Maldives Cat Rescue
- birds route to Zoophilist Society Maldives

Key fields:
- `id`
- `reference_code`
- `report_kind`
- `species`
- `bird_species`
- `reporter_user_id`
- `reporter_name`
- `reporter_email`
- `area_label`
- `description`
- `photo_object_key`
- `routed_to_organization_id`
- `status`

---

## clinics
Vet directory entries.

Key fields:
- `id`
- `slug`
- `name`
- `area_label`
- `address`
- `phone`
- `note`
- `maps_url`
- `is_active`

---

## clinic_services
Normalized services per clinic.

Examples:
- Surgery
- Diagnostics
- Grooming
- Medical care
- Pet shop

---

## moderation_events
Immutable audit log for listing moderation and lifecycle actions.

Needed for:
- accountability
- admin audit history
- future analytics

Key fields:
- `id`
- `listing_id`
- `actor_user_id`
- `action`
- `reason`
- `metadata_json`

---

## Main relationships
- `organizations 1--many organization_members`
- `users 1--many organization_members`
- `users 1--many listings` for individual listings
- `organizations 1--many listings` for verified-org listings
- `listings 1--many listing_images`
- `listings many--many tags` through `listing_tag_assignments`
- `users many--many listings` through `saved_listings`
- `listings 1--many adoption_inquiries`
- `organizations 1--many lost_found_reports` through routing
- `listings 1--many moderation_events`
- `clinics 1--many clinic_services`

---

## Important access patterns to optimize for

### Browse feed
Query by:
- `status = 'live'`
- `species`
- tag filters
- search text over name/area/tag labels
- recent-first ordering

Needs indexes on:
- `(status, species, created_at)`
- listing-tag join tables
- `slug`

### Moderator queue
Query by:
- `status = 'pending'`
- oldest/newest first

Needs index on:
- `(status, created_at)`

### My listings
Query by:
- `listed_by_user_id`
- optionally `status`

### My inquiries
Query by:
- `sender_user_id`
- recent-first

### Saved listings
Query by:
- `user_id`
- recent-first

### Lost/found operations
Query by:
- `routed_to_organization_id`
- `status`
- recent-first

---

## MVP business rules to enforce

1. `bird_species` must be present only for bird listings/reports
2. a listing must belong to either an individual user or an organization
3. only `pending` listings can be approved/rejected
4. only `live` listings can be marked adopted
5. `saved_listings` must be unique per `(user_id, listing_id)`
6. `reference_code` for reports must be unique
7. verified-org listings can publish directly later, but the schema should still support moderation audit history

---

## Open questions for next pass

1. Should reports stay anonymous-only, or optionally authenticated as well?
2. Do we want users to receive replies/messages to inquiries inside the app, or keep MVP one-way?
3. Should org membership support multiple roles now, or just `admin/member`?
4. Do we need island/atoll structured geography now, or is `area_label` enough for MVP?
5. Do we want soft-delete/archive states for listings, or is current lifecycle enough?

---

## Files created from this model
- `backend/sql/001_initial_schema.sql`
- `backend/contracts.ts`

These are the first backend foundation artifacts and should drive the next implementation slice.