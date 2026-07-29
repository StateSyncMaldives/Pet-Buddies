-- Adapt `users` for Better Auth and add the session/account/verification tables.
--
-- HAND-EDITED, deliberately, over what drizzle-kit generated. The generated
-- version did `DROP TABLE users` guarded by `PRAGMA foreign_keys=OFF`, which
-- cannot work here:
--
--   * D1 always enforces foreign keys and ignores that PRAGMA, and
--     `splitD1MigrationStatements` strips PRAGMA statements outright;
--   * `DROP TABLE` performs an implicit `DELETE FROM`, which DOES fire foreign
--     key actions. `listings.listed_by_user_id` is ON DELETE SET NULL and
--     `listings` carries CHECK (organization_id IS NOT NULL OR
--     listed_by_user_id IS NOT NULL), so the drop nulled the owner of every
--     user-owned listing and failed with `listings_owner_check`.
--
-- It passed on empty databases and failed on the populated one. So instead of
-- disabling foreign keys, this moves every dependent row aside first, rebuilds
-- `users` while nothing references it, and puts the rows back. The rebuild is
-- unavoidable: `google_sub` was NOT NULL UNIQUE and must become nullable and
-- non-unique, which SQLite cannot express as an ALTER.
--
-- The generated version also dropped `global_role` on the way through (its
-- INSERT…SELECT omitted the column), silently demoting every moderator and
-- administrator. It is carried across here as `role`.

CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`impersonated_by` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint

-- Stash every table that references `users`, plus the two that cascade off
-- `listings`. CREATE TABLE … AS SELECT copies rows into a constraint-free
-- table, so the originals can be emptied without tripping anything.
CREATE TABLE `_mig_listings` AS SELECT * FROM `listings`;
--> statement-breakpoint
CREATE TABLE `_mig_listing_images` AS SELECT * FROM `listing_images`;
--> statement-breakpoint
CREATE TABLE `_mig_listing_tag_assignments` AS SELECT * FROM `listing_tag_assignments`;
--> statement-breakpoint
CREATE TABLE `_mig_saved_listings` AS SELECT * FROM `saved_listings`;
--> statement-breakpoint
CREATE TABLE `_mig_adoption_inquiries` AS SELECT * FROM `adoption_inquiries`;
--> statement-breakpoint
CREATE TABLE `_mig_moderation_events` AS SELECT * FROM `moderation_events`;
--> statement-breakpoint
CREATE TABLE `_mig_lost_found_reports` AS SELECT * FROM `lost_found_reports`;
--> statement-breakpoint
CREATE TABLE `_mig_organization_members` AS SELECT * FROM `organization_members`;
--> statement-breakpoint

-- Empty them children-first, so no row references `users` when it is dropped.
DELETE FROM `listing_tag_assignments`;
--> statement-breakpoint
DELETE FROM `listing_images`;
--> statement-breakpoint
DELETE FROM `saved_listings`;
--> statement-breakpoint
DELETE FROM `adoption_inquiries`;
--> statement-breakpoint
DELETE FROM `moderation_events`;
--> statement-breakpoint
DELETE FROM `listings`;
--> statement-breakpoint
DELETE FROM `lost_found_reports`;
--> statement-breakpoint
DELETE FROM `organization_members`;
--> statement-breakpoint

CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`google_sub` text,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`display_name` text NOT NULL,
	`avatar_url` text,
	`role` text DEFAULT 'user' NOT NULL,
	`banned` integer DEFAULT false NOT NULL,
	`ban_reason` text,
	`ban_expires` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT "users_role_check" CHECK("__new_users"."role" in ('user', 'moderator', 'admin'))
);
--> statement-breakpoint
-- `global_role` becomes `role`. An existing `google_sub` means the account
-- already signed in through Google, so its address is verified. The timestamp
-- columns move from TEXT (CURRENT_TIMESTAMP) to INTEGER (unix seconds).
INSERT INTO `__new_users` (
	`id`, `google_sub`, `email`, `email_verified`, `display_name`, `avatar_url`,
	`role`, `banned`, `ban_reason`, `ban_expires`, `created_at`, `updated_at`
)
SELECT
	`id`,
	`google_sub`,
	`email`,
	CASE WHEN `google_sub` IS NOT NULL THEN 1 ELSE 0 END,
	`display_name`,
	`avatar_url`,
	`global_role`,
	0,
	NULL,
	NULL,
	COALESCE(CAST(strftime('%s', `created_at`) AS INTEGER), unixepoch()),
	COALESCE(CAST(strftime('%s', `updated_at`) AS INTEGER), unixepoch())
FROM `users`;
--> statement-breakpoint
DROP TABLE `users`;
--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
--> statement-breakpoint

-- Put the rows back, parents before children.
INSERT INTO `organization_members` SELECT * FROM `_mig_organization_members`;
--> statement-breakpoint
INSERT INTO `listings` SELECT * FROM `_mig_listings`;
--> statement-breakpoint
INSERT INTO `listing_images` SELECT * FROM `_mig_listing_images`;
--> statement-breakpoint
INSERT INTO `listing_tag_assignments` SELECT * FROM `_mig_listing_tag_assignments`;
--> statement-breakpoint
INSERT INTO `saved_listings` SELECT * FROM `_mig_saved_listings`;
--> statement-breakpoint
INSERT INTO `adoption_inquiries` SELECT * FROM `_mig_adoption_inquiries`;
--> statement-breakpoint
INSERT INTO `moderation_events` SELECT * FROM `_mig_moderation_events`;
--> statement-breakpoint
INSERT INTO `lost_found_reports` SELECT * FROM `_mig_lost_found_reports`;
--> statement-breakpoint

DROP TABLE `_mig_organization_members`;
--> statement-breakpoint
DROP TABLE `_mig_lost_found_reports`;
--> statement-breakpoint
DROP TABLE `_mig_moderation_events`;
--> statement-breakpoint
DROP TABLE `_mig_adoption_inquiries`;
--> statement-breakpoint
DROP TABLE `_mig_saved_listings`;
--> statement-breakpoint
DROP TABLE `_mig_listing_tag_assignments`;
--> statement-breakpoint
DROP TABLE `_mig_listing_images`;
--> statement-breakpoint
DROP TABLE `_mig_listings`;
