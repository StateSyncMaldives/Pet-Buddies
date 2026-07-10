CREATE TABLE `adoption_inquiries` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text NOT NULL,
	`sender_user_id` text NOT NULL,
	`recipient_user_id` text,
	`recipient_organization_id` text,
	`recipient_display_name_snapshot` text NOT NULL,
	`listing_name_snapshot` text NOT NULL,
	`message` text NOT NULL,
	`status` text DEFAULT 'awaiting_reply' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sender_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recipient_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`recipient_organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "adoption_inquiries_status_check" CHECK("adoption_inquiries"."status" in ('awaiting_reply', 'replied', 'withdrawn', 'closed')),
	CONSTRAINT "adoption_inquiries_recipient_check" CHECK("adoption_inquiries"."recipient_user_id" is not null or "adoption_inquiries"."recipient_organization_id" is not null)
);
--> statement-breakpoint
CREATE INDEX `idx_adoption_inquiries_sender_created` ON `adoption_inquiries` (`sender_user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_adoption_inquiries_recipient_user_created` ON `adoption_inquiries` (`recipient_user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_adoption_inquiries_recipient_org_created` ON `adoption_inquiries` (`recipient_organization_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `clinic_services` (
	`clinic_id` text NOT NULL,
	`service_name` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`clinic_id`, `service_name`),
	FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `clinics` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`area_label` text NOT NULL,
	`address` text,
	`phone` text,
	`note` text,
	`maps_url` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "clinics_is_active_check" CHECK("clinics"."is_active" in (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `clinics_slug_unique` ON `clinics` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `clinics_name_unique` ON `clinics` (`name`);--> statement-breakpoint
CREATE TABLE `listing_images` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text NOT NULL,
	`object_key` text NOT NULL,
	`public_url` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`width` integer,
	`height` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_listing_images_listing` ON `listing_images` (`listing_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `listing_tag_assignments` (
	`listing_id` text NOT NULL,
	`tag_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`listing_id`, `tag_id`),
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_listing_tag_assignments_tag` ON `listing_tag_assignments` (`tag_id`,`listing_id`);--> statement-breakpoint
CREATE TABLE `listings` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`species` text NOT NULL,
	`bird_species` text,
	`name` text NOT NULL,
	`age_text` text NOT NULL,
	`sex` text DEFAULT 'unknown' NOT NULL,
	`area_label` text NOT NULL,
	`story` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`listed_by_user_id` text,
	`organization_id` text,
	`published_at` text,
	`adopted_at` text,
	`rejected_at` text,
	`rejected_reason` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`listed_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "listings_species_check" CHECK("listings"."species" in ('cat', 'bird')),
	CONSTRAINT "listings_sex_check" CHECK("listings"."sex" in ('male', 'female', 'unknown')),
	CONSTRAINT "listings_status_check" CHECK("listings"."status" in ('pending', 'live', 'rejected', 'adopted')),
	CONSTRAINT "listings_bird_species_check" CHECK(("listings"."species" = 'bird' and "listings"."bird_species" in ('Budgerigar', 'Cockatiel', 'Lovebird', 'Finch', 'Canary')) or ("listings"."species" = 'cat' and "listings"."bird_species" is null)),
	CONSTRAINT "listings_owner_check" CHECK("listings"."organization_id" is not null or "listings"."listed_by_user_id" is not null)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `listings_slug_unique` ON `listings` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_listings_status_species_created` ON `listings` (`status`,`species`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_listings_listed_by_user` ON `listings` (`listed_by_user_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_listings_organization` ON `listings` (`organization_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_listings_area_label` ON `listings` (`area_label`);--> statement-breakpoint
CREATE TABLE `lost_found_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`reference_code` text NOT NULL,
	`report_kind` text NOT NULL,
	`species` text NOT NULL,
	`bird_species` text,
	`reporter_user_id` text,
	`reporter_name` text,
	`reporter_email` text,
	`area_label` text NOT NULL,
	`description` text NOT NULL,
	`photo_object_key` text,
	`routed_to_organization_id` text NOT NULL,
	`status` text DEFAULT 'submitted' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`reporter_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`routed_to_organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "lost_found_reports_report_kind_check" CHECK("lost_found_reports"."report_kind" in ('lost', 'found')),
	CONSTRAINT "lost_found_reports_species_check" CHECK("lost_found_reports"."species" in ('cat', 'bird')),
	CONSTRAINT "lost_found_reports_status_check" CHECK("lost_found_reports"."status" in ('submitted', 'reviewing', 'resolved', 'closed')),
	CONSTRAINT "lost_found_reports_bird_species_check" CHECK(("lost_found_reports"."species" = 'bird' and "lost_found_reports"."bird_species" in ('Budgerigar', 'Cockatiel', 'Lovebird', 'Finch', 'Canary')) or ("lost_found_reports"."species" = 'cat' and "lost_found_reports"."bird_species" is null))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lost_found_reports_reference_code_unique` ON `lost_found_reports` (`reference_code`);--> statement-breakpoint
CREATE INDEX `idx_lost_found_reports_routed_status_created` ON `lost_found_reports` (`routed_to_organization_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_lost_found_reports_status_created` ON `lost_found_reports` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `moderation_events` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text NOT NULL,
	`actor_user_id` text NOT NULL,
	`action` text NOT NULL,
	`reason` text,
	`metadata_json` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "moderation_events_action_check" CHECK("moderation_events"."action" in ('submitted', 'approved', 'rejected', 'adopted', 'restored'))
);
--> statement-breakpoint
CREATE INDEX `idx_moderation_events_listing_created` ON `moderation_events` (`listing_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `organization_members` (
	`organization_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`organization_id`, `user_id`),
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "organization_members_role_check" CHECK("organization_members"."role" in ('member', 'admin', 'listing_manager'))
);
--> statement-breakpoint
CREATE INDEX `idx_organization_members_user` ON `organization_members` (`user_id`);--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`kind` text DEFAULT 'rescue' NOT NULL,
	`description` text,
	`area_label` text,
	`contact_email` text,
	`contact_phone` text,
	`is_verified` integer DEFAULT false NOT NULL,
	`verified_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "organizations_kind_check" CHECK("organizations"."kind" in ('rescue', 'ngo', 'partner', 'community')),
	CONSTRAINT "organizations_is_verified_check" CHECK("organizations"."is_verified" in (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organizations_slug_unique` ON `organizations` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `organizations_name_unique` ON `organizations` (`name`);--> statement-breakpoint
CREATE TABLE `saved_listings` (
	`user_id` text NOT NULL,
	`listing_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_id`, `listing_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_saved_listings_user_created` ON `saved_listings` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`label` text NOT NULL,
	`species_scope` text DEFAULT 'both' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "tags_species_scope_check" CHECK("tags"."species_scope" in ('cat', 'bird', 'both'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_slug_unique` ON `tags` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `tags_label_unique` ON `tags` (`label`);--> statement-breakpoint
CREATE INDEX `idx_tags_species_scope` ON `tags` (`species_scope`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`google_sub` text NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`avatar_url` text,
	`global_role` text DEFAULT 'user' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "users_global_role_check" CHECK("users"."global_role" in ('user', 'moderator', 'admin'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_google_sub_unique` ON `users` (`google_sub`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);