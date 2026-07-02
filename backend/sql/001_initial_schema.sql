PRAGMA foreign_keys = ON;

-- Pet Buddies initial backend schema
-- SQL is intentionally D1/SQLite-friendly.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  google_sub TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  global_role TEXT NOT NULL DEFAULT 'user' CHECK (global_role IN ('user', 'moderator', 'admin')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL DEFAULT 'rescue' CHECK (kind IN ('rescue', 'ngo', 'partner', 'community')),
  description TEXT,
  area_label TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  is_verified INTEGER NOT NULL DEFAULT 0 CHECK (is_verified IN (0, 1)),
  verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organization_members (
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin', 'listing_manager')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (organization_id, user_id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL UNIQUE,
  species_scope TEXT NOT NULL DEFAULT 'both' CHECK (species_scope IN ('cat', 'bird', 'both')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  species TEXT NOT NULL CHECK (species IN ('cat', 'bird')),
  bird_species TEXT,
  name TEXT NOT NULL,
  age_text TEXT NOT NULL,
  sex TEXT NOT NULL DEFAULT 'unknown' CHECK (sex IN ('male', 'female', 'unknown')),
  area_label TEXT NOT NULL,
  story TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'live', 'rejected', 'adopted')),
  listed_by_user_id TEXT,
  organization_id TEXT,
  published_at TEXT,
  adopted_at TEXT,
  rejected_at TEXT,
  rejected_reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (listed_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL,
  CHECK (
    (species = 'bird' AND bird_species IN ('Budgerigar', 'Cockatiel', 'Lovebird', 'Finch', 'Canary'))
    OR (species = 'cat' AND bird_species IS NULL)
  ),
  CHECK (organization_id IS NOT NULL OR listed_by_user_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS listing_images (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL,
  object_key TEXT NOT NULL,
  public_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  width INTEGER,
  height INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS listing_tag_assignments (
  listing_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (listing_id, tag_id),
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS saved_listings (
  user_id TEXT NOT NULL,
  listing_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, listing_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS adoption_inquiries (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL,
  sender_user_id TEXT NOT NULL,
  recipient_user_id TEXT,
  recipient_organization_id TEXT,
  recipient_display_name_snapshot TEXT NOT NULL,
  listing_name_snapshot TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'awaiting_reply' CHECK (status IN ('awaiting_reply', 'replied', 'withdrawn', 'closed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (recipient_organization_id) REFERENCES organizations(id) ON DELETE SET NULL,
  CHECK (recipient_user_id IS NOT NULL OR recipient_organization_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS lost_found_reports (
  id TEXT PRIMARY KEY,
  reference_code TEXT NOT NULL UNIQUE,
  report_kind TEXT NOT NULL CHECK (report_kind IN ('lost', 'found')),
  species TEXT NOT NULL CHECK (species IN ('cat', 'bird')),
  bird_species TEXT,
  reporter_user_id TEXT,
  reporter_name TEXT,
  reporter_email TEXT,
  area_label TEXT NOT NULL,
  description TEXT NOT NULL,
  photo_object_key TEXT,
  routed_to_organization_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewing', 'resolved', 'closed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reporter_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (routed_to_organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
  CHECK (
    (species = 'bird' AND bird_species IN ('Budgerigar', 'Cockatiel', 'Lovebird', 'Finch', 'Canary'))
    OR (species = 'cat' AND bird_species IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS clinics (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  area_label TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  note TEXT,
  maps_url TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clinic_services (
  clinic_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (clinic_id, service_name),
  FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS moderation_events (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected', 'adopted', 'restored')),
  reason TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_organization_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_species_scope ON tags(species_scope);
CREATE INDEX IF NOT EXISTS idx_listings_status_species_created ON listings(status, species, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_listed_by_user ON listings(listed_by_user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_organization ON listings(organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_area_label ON listings(area_label);
CREATE INDEX IF NOT EXISTS idx_listing_images_listing ON listing_images(listing_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_listing_tag_assignments_tag ON listing_tag_assignments(tag_id, listing_id);
CREATE INDEX IF NOT EXISTS idx_saved_listings_user_created ON saved_listings(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_adoption_inquiries_sender_created ON adoption_inquiries(sender_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_adoption_inquiries_recipient_user_created ON adoption_inquiries(recipient_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_adoption_inquiries_recipient_org_created ON adoption_inquiries(recipient_organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lost_found_reports_routed_status_created ON lost_found_reports(routed_to_organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lost_found_reports_status_created ON lost_found_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_events_listing_created ON moderation_events(listing_id, created_at DESC);
