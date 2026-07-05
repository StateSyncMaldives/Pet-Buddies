export const MEDIA_ROUTE_BASE_PATH = '/media'

const MANAGED_KEY_PREFIXES = ['listing-images/', 'report-photos/']

export function isManagedMediaObjectKey(objectKey: string): boolean {
  return MANAGED_KEY_PREFIXES.some((prefix) => objectKey.startsWith(prefix))
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

  const encodedKey = record.objectKey.split('/').map(encodeURIComponent).join('/')

  if (options?.publicBaseUrl) {
    const base = options.publicBaseUrl.endsWith('/') ? options.publicBaseUrl : `${options.publicBaseUrl}/`
    return new URL(encodedKey, base).toString()
  }

  return `${MEDIA_ROUTE_BASE_PATH}/${encodedKey}`
}
