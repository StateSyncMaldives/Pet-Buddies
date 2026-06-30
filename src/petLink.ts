// Hash-based deep links for individual pets, e.g. `…/#/pet/mishka`.
// Keeps shareable URLs working without a full router.

export const PET_HASH = /^#\/pet\/(.+)$/

/** Pet id from a hash like `#/pet/mishka`, or null. */
export function petIdFromHash(hash: string = location.hash): string | null {
  return hash.match(PET_HASH)?.[1] ?? null
}

/** Absolute, shareable URL for a pet. */
export function petUrl(id: string): string {
  return `${location.origin}${location.pathname}#/pet/${id}`
}
