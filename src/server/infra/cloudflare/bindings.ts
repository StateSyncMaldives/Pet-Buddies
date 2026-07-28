import { createDrizzleDatabaseFromD1, type PetBuddiesDrizzleDatabase } from '../db/d1-drizzle'
import { createR2MediaObjectStore, type MediaObjectStore } from '../media/r2-media-store'

export interface PetBuddiesCloudflareBindings {
  DB: D1Database
  MEDIA_BUCKET: R2Bucket
  BETTER_AUTH_SECRET: string
  BETTER_AUTH_URL: string
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  /**
   * Optional bootstrap credentials for a cold-start seed. Absent means no
   * administrator is created — deliberately, so an unconfigured environment
   * never gets one whose password is committed to the repository.
   */
  BOOTSTRAP_ADMIN_EMAIL?: string
  BOOTSTRAP_ADMIN_PASSWORD?: string
  BOOTSTRAP_MODERATOR_EMAIL?: string
  BOOTSTRAP_MODERATOR_PASSWORD?: string
}

export interface PetBuddiesCloudflareInfrastructure {
  database: PetBuddiesDrizzleDatabase
  mediaObjects: MediaObjectStore
}

export function createCloudflareInfrastructure(input: {
  env: PetBuddiesCloudflareBindings
  mediaPublicBaseUrl?: string
}): PetBuddiesCloudflareInfrastructure {
  return {
    database: createDrizzleDatabaseFromD1(input.env.DB),
    mediaObjects: createR2MediaObjectStore({
      bucket: input.env.MEDIA_BUCKET,
      publicBaseUrl: input.mediaPublicBaseUrl,
    }),
  }
}
