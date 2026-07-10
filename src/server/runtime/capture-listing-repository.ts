import type { ListingAggregate } from '../domain/listings/listing-mapper'
import type { ListingRepository } from '../domain/listings/listing-repository'

/**
 * A minimal ListingRepository used only to run the synchronous listing write
 * use-cases inside the durable backend. Reads resolve against a single
 * pre-loaded aggregate (the row already fetched from D1); writes are captured by
 * reference so the durable backend can persist exactly what the use-case
 * produced — no in-memory store, no cloning, and no read-back. This keeps the
 * domain write rules as the single source of truth while writing straight
 * through to D1. See ADR 0008 / #6.
 */
export interface CaptureListingRepository {
  repository: ListingRepository
  getCaptured: () => ListingAggregate | null
}

export function createCaptureListingRepository(current: ListingAggregate | null = null): CaptureListingRepository {
  let captured: ListingAggregate | null = null

  const capture = (aggregate: ListingAggregate): ListingAggregate => {
    captured = aggregate
    return aggregate
  }

  return {
    repository: {
      browse: () => (current ? [current] : []),
      listAll: () => (current ? [current] : []),
      getById: (id) => (current && current.listing.id === id ? current : null),
      getBySlug: (slug) => (current && current.listing.slug === slug ? current : null),
      create: capture,
      save: capture,
      updateStatus: () => null,
      toggleSavedListing: () => false,
    },
    getCaptured: () => captured,
  }
}
