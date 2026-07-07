import type { PetBuddiesCloudflareBindings } from '../cloudflare/bindings'
import { createR2MediaObjectStore, type MediaObjectStore } from './r2-media-store'

/**
 * Resolves the durable media store from the Worker bindings. Returns null
 * outside the Worker (vitest, plain dev without workerd) so callers can fall
 * back to the demo in-memory store.
 */
export function resolveWorkerMediaStore(
  env: Partial<PetBuddiesCloudflareBindings> | null | undefined,
): MediaObjectStore | null {
  if (!env?.MEDIA_BUCKET) {
    return null
  }

  return createR2MediaObjectStore({ bucket: env.MEDIA_BUCKET })
}
