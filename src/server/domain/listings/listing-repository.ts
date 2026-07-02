import type { BrowseListingsQuery, ListingStatus } from '../../contracts/api'
import type { ListingAggregate } from './listing-mapper'

export interface ToggleSavedListingInput {
  listingId: string
  viewerId: string
}

export interface ListingRepository {
  browse(query: BrowseListingsQuery): ListingAggregate[]
  getById(id: string): ListingAggregate | null
  getBySlug(slug: string): ListingAggregate | null
  create(aggregate: ListingAggregate): ListingAggregate
  save(aggregate: ListingAggregate): ListingAggregate
  updateStatus(id: string, status: ListingStatus): ListingAggregate | null
  toggleSavedListing(input: ToggleSavedListingInput): boolean
}

export function createInMemoryListingRepository(input: {
  listings?: ListingAggregate[]
}): ListingRepository {
  const listings = new Map<string, ListingAggregate>()
  const slugToId = new Map<string, string>()
  const savedByViewer = new Map<string, Set<string>>()

  for (const aggregate of input.listings ?? []) {
    listings.set(aggregate.listing.id, cloneAggregate(aggregate))
    slugToId.set(aggregate.listing.slug, aggregate.listing.id)
  }

  return {
    browse(query) {
      return Array.from(listings.values())
        .filter((aggregate) => {
          if (query.species && aggregate.listing.species !== query.species) {
            return false
          }

          return true
        })
        .map((aggregate) => withSavedState(aggregate, savedByViewer.get('viewer-1')))
    },
    getById(id) {
      const aggregate = listings.get(id)
      return aggregate ? cloneAggregate(aggregate) : null
    },
    getBySlug(slug) {
      const id = slugToId.get(slug)
      return id ? this.getById(id) : null
    },
    create(aggregate) {
      const cloned = cloneAggregate(aggregate)
      listings.set(cloned.listing.id, cloned)
      slugToId.set(cloned.listing.slug, cloned.listing.id)
      return cloneAggregate(cloned)
    },
    save(aggregate) {
      const cloned = cloneAggregate(aggregate)
      listings.set(cloned.listing.id, cloned)
      slugToId.set(cloned.listing.slug, cloned.listing.id)
      return cloneAggregate(cloned)
    },
    updateStatus(id, status) {
      const current = listings.get(id)
      if (!current) {
        return null
      }

      const updated = {
        ...current,
        listing: {
          ...current.listing,
          status,
        },
      }
      listings.set(id, updated)
      return cloneAggregate(updated)
    },
    toggleSavedListing({ listingId, viewerId }) {
      const saved = savedByViewer.get(viewerId) ?? new Set<string>()
      if (saved.has(listingId)) {
        saved.delete(listingId)
        savedByViewer.set(viewerId, saved)
        return false
      }

      saved.add(listingId)
      savedByViewer.set(viewerId, saved)
      return true
    },
  }
}

function cloneAggregate(aggregate: ListingAggregate): ListingAggregate {
  return {
    listing: { ...aggregate.listing },
    images: aggregate.images.map((image) => ({ ...image })),
    tags: aggregate.tags.map((tag) => ({ ...tag })),
    organization: aggregate.organization ? { ...aggregate.organization } : null,
    listedByUser: aggregate.listedByUser ? { ...aggregate.listedByUser } : null,
    savedByViewer: aggregate.savedByViewer,
  }
}

function withSavedState(aggregate: ListingAggregate, savedIds?: Set<string>): ListingAggregate {
  return {
    ...cloneAggregate(aggregate),
    savedByViewer: savedIds?.has(aggregate.listing.id) ?? aggregate.savedByViewer,
  }
}
