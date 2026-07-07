import { KIND_PREFIXES } from './media-object-keys'

export const MEDIA_ROUTE_BASE_PATH = '/media'

const MANAGED_KEY_PREFIXES = Object.values(KIND_PREFIXES).map((prefix) => `${prefix}/`)

export function isManagedMediaObjectKey(objectKey: string): boolean {
  return MANAGED_KEY_PREFIXES.some((prefix) => objectKey.startsWith(prefix))
}

export function encodeObjectKeyPath(objectKey: string): string {
  return objectKey.split('/').map(encodeURIComponent).join('/')
}

export function joinPublicMediaUrl(publicBaseUrl: string, objectKey: string): string {
  const base = publicBaseUrl.endsWith('/') ? publicBaseUrl : `${publicBaseUrl}/`
  return new URL(encodeObjectKeyPath(objectKey), base).toString()
}

/**
 * The object key is the source of truth for managed media (ADR 0005): URLs
 * are derived on every read and any persisted publicUrl is ignored. Unmanaged
 * keys (seed data) keep their stored URL.
 */
export function resolveMediaUrl(
  record: { objectKey: string; publicUrl?: string | null },
  options?: { publicBaseUrl?: string },
): string | null {
  if (!isManagedMediaObjectKey(record.objectKey)) {
    return record.publicUrl ?? null
  }

  if (options?.publicBaseUrl) {
    return joinPublicMediaUrl(options.publicBaseUrl, record.objectKey)
  }

  return `${MEDIA_ROUTE_BASE_PATH}/${encodeObjectKeyPath(record.objectKey)}`
}
