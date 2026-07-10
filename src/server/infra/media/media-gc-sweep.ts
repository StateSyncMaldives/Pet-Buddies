import type { drizzle } from 'drizzle-orm/d1'

import { KIND_PREFIXES } from '../../domain/media/media-object-keys'
import { selectOrphanedMediaKeys, type StoredMediaObject } from '../../domain/media/media-gc'
import type { PetBuddiesCloudflareBindings } from '../cloudflare/bindings'
import { createDrizzleDatabaseFromD1 } from '../db/d1-drizzle'
import * as schema from '../db/schema'

type PetBuddiesDb = ReturnType<typeof drizzle<typeof schema>>

/** Objects uploaded within the last day are spared as possible in-flight uploads. */
export const DEFAULT_MEDIA_GC_GRACE_MS = 24 * 60 * 60 * 1000

/** The slice of R2Bucket the sweep needs — list managed objects and delete keys. */
export interface MediaGcBucket {
  list(options?: {
    prefix?: string
    cursor?: string
  }): Promise<{ objects: Array<{ key: string; uploaded: Date }>; truncated: boolean; cursor?: string }>
  delete(keys: string | string[]): Promise<void>
}

/**
 * Loads every media object key referenced by a durable row — listing images and
 * lost/found report photos — so the sweep never deletes a blob still in use.
 */
export async function loadReferencedMediaKeys(db: PetBuddiesDb): Promise<Set<string>> {
  const [images, reports] = await Promise.all([
    db.select({ objectKey: schema.listingImages.objectKey }).from(schema.listingImages).all(),
    db.select({ photoObjectKey: schema.lostFoundReports.photoObjectKey }).from(schema.lostFoundReports).all(),
  ])

  const keys = new Set<string>()
  for (const row of images) keys.add(row.objectKey)
  for (const row of reports) if (row.photoObjectKey) keys.add(row.photoObjectKey)
  return keys
}

async function listManagedObjects(bucket: MediaGcBucket): Promise<StoredMediaObject[]> {
  const stored: StoredMediaObject[] = []
  for (const prefix of Object.values(KIND_PREFIXES)) {
    let cursor: string | undefined
    do {
      const page = await bucket.list({ prefix: `${prefix}/`, cursor })
      for (const object of page.objects) {
        stored.push({ objectKey: object.key, uploadedAt: object.uploaded.toISOString() })
      }
      cursor = page.truncated ? page.cursor : undefined
    } while (cursor)
  }
  return stored
}

/**
 * Sweeps orphaned media blobs from R2: lists managed objects, computes which are
 * unreferenced and older than the grace window, and deletes them. Idempotent and
 * safe to re-run — a blob referenced by any durable row is never deleted. Intended
 * to be invoked from a scheduled Worker (cron trigger). See #11.
 */
export async function sweepOrphanedMedia(input: {
  bucket: MediaGcBucket
  referencedKeys: () => Promise<Set<string>>
  now: () => string
  graceMs?: number
}): Promise<{ deleted: string[] }> {
  const [stored, referencedKeys] = await Promise.all([listManagedObjects(input.bucket), input.referencedKeys()])

  const orphans = selectOrphanedMediaKeys({
    stored,
    referencedKeys,
    now: input.now(),
    graceMs: input.graceMs ?? DEFAULT_MEDIA_GC_GRACE_MS,
  })

  if (orphans.length > 0) {
    await input.bucket.delete(orphans)
  }

  return { deleted: orphans }
}

/**
 * Deploy entry point for the sweep: resolves the durable D1 database and R2
 * bucket from the Worker bindings and reclaims orphaned blobs. Intended to be
 * called from a scheduled (cron) Worker handler; safe to call ad hoc. See #11.
 */
export function runMediaGarbageCollection(input: {
  env: Pick<PetBuddiesCloudflareBindings, 'DB' | 'MEDIA_BUCKET'>
  now?: () => string
  graceMs?: number
}): Promise<{ deleted: string[] }> {
  const db = createDrizzleDatabaseFromD1(input.env.DB)
  return sweepOrphanedMedia({
    bucket: input.env.MEDIA_BUCKET as unknown as MediaGcBucket,
    referencedKeys: () => loadReferencedMediaKeys(db),
    now: input.now ?? (() => new Date().toISOString()),
    graceMs: input.graceMs,
  })
}
