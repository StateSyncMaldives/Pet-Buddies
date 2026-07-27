import { createDrizzleDatabaseFromD1, type PetBuddiesDrizzleDatabase } from '../db/d1-drizzle'
import { createR2MediaObjectStore, type MediaObjectStore } from '../media/r2-media-store'

export interface PetBuddiesCloudflareBindings {
  DB: D1Database
  MEDIA_BUCKET: R2Bucket
  BETTER_AUTH_SECRET: string
  BETTER_AUTH_URL: string
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
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
