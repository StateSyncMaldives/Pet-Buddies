import type { drizzle } from 'drizzle-orm/d1'

import type {
  AdoptionInquiryRecord,
  LostFoundReportRecord,
  ModerationEventRecord,
} from '../../../backend/contracts'
import { apiResultErr, apiResultOk } from '../contracts/api'
import { createClinicService } from '../../features/clinics/clinic-service'
import { createSeedClinicRepository } from '../../features/clinics/clinic-repository'
import { createCreateInquiryUseCase } from '../../features/inquiries/create-inquiry'
import { createCreateListingUseCase } from '../domain/listings/create-listing'
import { createModerateListingUseCase } from '../domain/listings/moderate-listing'
import { createListingService } from '../domain/listings/listing-service'
import { createInMemoryListingRepository } from '../domain/listings/listing-repository'
import { toListingDetail } from '../domain/listings/listing-mapper'
import { createCreateReportUseCase } from '../../features/reports/create-report'
import { createDrizzleAdoptionInquiryRepository } from '../infra/repositories/drizzle-adoption-inquiry-repository'
import { createDrizzleListingRepository } from '../infra/repositories/drizzle-listing-repository'
import { createDrizzleLostFoundReportRepository } from '../infra/repositories/drizzle-lost-found-report-repository'
import { createDrizzleModerationEventRepository } from '../infra/repositories/drizzle-moderation-event-repository'
import { createDrizzleSavedListingRepository } from '../infra/repositories/drizzle-saved-listing-repository'
import { slugify } from './seed-listing-aggregates'
import type * as schema from '../infra/db/schema'
import type { AsyncAppBackend } from './app-backend'

type PetBuddiesDb = ReturnType<typeof drizzle<typeof schema>>

const now = () => new Date().toISOString()
const generateReferenceCode = () => `MV${Math.floor(1000 + Math.random() * 9000)}`

/**
 * The durable (D1-backed) application backend. Reads run against D1; writes
 * reuse the (synchronous) domain use-cases against a scratch in-memory
 * repository seeded with the current listing, capture the resulting records via
 * the use-cases' save callbacks, and persist them to D1 through the async
 * repositories. Media (getMediaObject/uploadMedia) and lookups delegate to the
 * in-memory `fallback`. See ADR 0008.
 */
export function createDurableBackend(input: { database: PetBuddiesDb; fallback: AsyncAppBackend }): AsyncAppBackend {
  const listingRepository = createDrizzleListingRepository({ db: input.database })
  const savedListingRepository = createDrizzleSavedListingRepository({ db: input.database, listingRepository })
  const moderationEventRepository = createDrizzleModerationEventRepository({ db: input.database })
  const inquiryRepository = createDrizzleAdoptionInquiryRepository({ db: input.database })
  const reportRepository = createDrizzleLostFoundReportRepository({ db: input.database })
  const clinicService = createClinicService({ repository: createSeedClinicRepository() })

  return {
    ...input.fallback,

    // ---- reads ----
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
    async listClinics() {
      return clinicService.listClinics()
    },
    async getYouReadModel({ viewerId }) {
      const [inquiries, owned] = await Promise.all([
        inquiryRepository.listSentBySender(viewerId),
        listingRepository.listAll(viewerId),
      ])
      return apiResultOk({
        sentAdoptionInquiries: inquiries.map((inquiry) => ({
          id: inquiry.id,
          listingId: inquiry.listingId,
          listingName: inquiry.listingNameSnapshot,
          recipientDisplayName: inquiry.recipientDisplayNameSnapshot,
          message: inquiry.message,
          status: inquiry.status,
          createdAt: inquiry.createdAt,
        })),
        ownedListings: owned
          .filter((aggregate) => aggregate.listing.listedByUserId === viewerId)
          .map((aggregate) => toListingDetail(aggregate)),
      })
    },
    async hydrateAppShell({ viewerId }) {
      const aggregates = await listingRepository.listAll(viewerId)
      const clinics = clinicService.listClinics()
      return {
        listings: aggregates.map(toListingDetail),
        clinics: clinics.ok ? clinics.data.items : [],
      }
    },

    // ---- writes ----
    async toggleSavedListing({ listingId, viewerId }) {
      const saved = await savedListingRepository.toggle({ viewerId, listingId })
      return apiResultOk({ listingId, saved })
    },
    async createListing(request) {
      const scratch = createInMemoryListingRepository({ listings: [] })
      const useCase = createCreateListingUseCase({
        repository: scratch,
        now,
        generateId: () => `listing-${crypto.randomUUID()}`,
        generateSlug: slugify,
      })
      const createdAt = now()
      const tags = request.request.tagIds.map((id) => ({
        id,
        slug: id,
        label: id,
        speciesScope: request.request.species,
        createdAt,
      }))
      const result = useCase.execute({ request: request.request, actorUserId: request.actorUserId, organization: null, tags })
      if (!result.ok) return result
      const created = scratch.getById(result.data.listing.id)
      if (created) await listingRepository.create(created)
      return result
    },
    async moderateListing(request) {
      const current = await listingRepository.getById(request.listingId)
      const scratch = createInMemoryListingRepository({ listings: current ? [current] : [] })
      let event: ModerationEventRecord | null = null
      const useCase = createModerateListingUseCase({
        repository: scratch,
        now,
        generateEventId: () => `mod-event-${crypto.randomUUID()}`,
        saveModerationEvent: (saved) => {
          event = saved
        },
      })
      const result = useCase.execute(request)
      if (!result.ok) return result
      const updated = scratch.getById(request.listingId)
      if (updated) await listingRepository.save(updated)
      if (event) await moderationEventRepository.save(event)
      return result
    },
    async createInquiry(request) {
      const current = await listingRepository.getById(request.request.listingId)
      const scratch = createInMemoryListingRepository({ listings: current ? [current] : [] })
      let inquiry: AdoptionInquiryRecord | null = null
      const useCase = createCreateInquiryUseCase({
        repository: scratch,
        now,
        generateId: () => `inquiry-${crypto.randomUUID()}`,
        saveInquiry: (saved) => {
          inquiry = saved
        },
      })
      const result = useCase.execute({
        listingId: request.request.listingId,
        message: request.request.message,
        senderUserId: request.viewerId,
      })
      if (!result.ok) return result
      if (inquiry) await inquiryRepository.save(inquiry)
      return result
    },
    async createReport(request) {
      let report: LostFoundReportRecord | null = null
      const useCase = createCreateReportUseCase({
        now,
        generateId: () => `report-${crypto.randomUUID()}`,
        generateReferenceCode,
        saveReport: (saved) => {
          report = saved
        },
      })
      const result = useCase.execute(request.request)
      if (!result.ok) return result
      if (report) await reportRepository.save(report)
      return result
    },
  }
}
