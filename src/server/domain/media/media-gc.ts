import { isManagedMediaObjectKey } from './media-url'

export interface StoredMediaObject {
  objectKey: string
  /** ISO-8601 upload timestamp (R2Object.uploaded). */
  uploadedAt: string
}

export interface SelectOrphanedMediaKeysInput {
  /** Every managed object currently in the bucket. */
  stored: StoredMediaObject[]
  /** Object keys referenced by a durable row (listing image or report photo). */
  referencedKeys: Iterable<string>
  now: string
  /** Objects uploaded within this window are spared (in-flight uploads). */
  graceMs: number
}

/**
 * Selects managed media object keys eligible for garbage collection: managed
 * keys that no durable row references and that were uploaded before the grace
 * window. Non-managed keys, still-referenced keys, and too-recent uploads are
 * never selected. Pure and idempotent — re-running on the same inputs yields
 * the same set. See #11.
 */
export function selectOrphanedMediaKeys(input: SelectOrphanedMediaKeysInput): string[] {
  const referenced = input.referencedKeys instanceof Set ? input.referencedKeys : new Set(input.referencedKeys)
  const cutoff = Date.parse(input.now) - input.graceMs

  return input.stored
    .filter((object) => isManagedMediaObjectKey(object.objectKey))
    .filter((object) => !referenced.has(object.objectKey))
    .filter((object) => Date.parse(object.uploadedAt) < cutoff)
    .map((object) => object.objectKey)
}
