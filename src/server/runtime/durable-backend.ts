import type { drizzle } from 'drizzle-orm/d1'

import { apiResultErr, apiResultOk } from '../contracts/api'
import { createClinicService } from '../domain/clinics/clinic-service'
import { createSeedClinicRepository } from '../domain/clinics/clinic-repository'
import { createListingService } from '../domain/listings/listing-service'
import { createInMemoryListingRepository } from '../domain/listings/listing-repository'
import { toListingDetail } from '../domain/listings/listing-mapper'
import { createDrizzleListingRepository } from '../infra/repositories/drizzle-listing-repository'
import { createDrizzleSavedListingRepository } from '../infra/repositories/drizzle-saved-listing-repository'
import type * as schema from '../infra/db/schema'
import type { AsyncAppBackend } from './app-backend'

type PetBuddiesDb = ReturnType<typeof drizzle<typeof schema>>

/**
 * The durable (D1-backed) application backend. Reads and saved-listing writes
 * run against D1; the remaining write use-cases (create listing, moderate,
 * inquiry, report) and media are delegated to the `fallback` (an async
 * in-memory backend) until they are durablised in a following slice. See ADR
 * 0008. Read filtering reuses the synchronous domain services by loading
 * aggregates from D1 into an in-memory repository first.
 */
export function createDurableBackend(input: { database: PetBuddiesDb; fallback: AsyncAppBackend }): AsyncAppBackend {
  const listingRepository = createDrizzleListingRepository({ db: input.database })
  const savedListingRepository = createDrizzleSavedListingRepository({ db: input.database, listingRepository })
  const clinicService = createClinicService({ repository: createSeedClinicRepository() })

  return {
    ...input.fallback,
    async browseListings({ query }) {
      const aggregates = await listingRepository.browse(query)
      const service = createListingService({ repository: createInMemoryListingRepository({ listings: aggregates }) })
      return service.browseListings(query)
    },
    async getListingDetail({ slugOrId }) {
      const aggregate = (await listingRepository.getBySlug(slugOrId)) ?? (await listingRepository.getById(slugOrId))
      if (!aggregate) {
        return apiResultErr('NOT_FOUND', 'Listing not found.')
      }
      return apiResultOk({ item: toListingDetail(aggregate) })
    },
    async listSavedListings({ viewerId }) {
      const aggregates = await savedListingRepository.listByViewer(viewerId)
      return apiResultOk({ items: aggregates.map(toListingDetail) })
    },
    async toggleSavedListing({ listingId, viewerId }) {
      const saved = await savedListingRepository.toggle({ viewerId, listingId })
      return apiResultOk({ listingId, saved })
    },
    async listClinics() {
      return clinicService.listClinics()
    },
    async hydrateAppShell({ viewerId }) {
      const aggregates = await listingRepository.listAll(viewerId)
      const clinics = clinicService.listClinics()
      return {
        listings: aggregates.map(toListingDetail),
        clinics: clinics.ok ? clinics.data.items : [],
      }
    },
  }
}
