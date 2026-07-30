import type {
  AdoptionInquiryRecord,
  ModerationEventRecord,
  OrganizationRecord,
  TagRecord,
  UserRecord,
} from '../../../backend/contracts'
import type {
  BirdSpecies,
  BrowseListingsResponse,
  ClinicSummary,
  CreateInquiryRequest,
  CreateInquiryResponse,
  CreateListingRequest,
  CreateListingResponse,
  CreateLostFoundReportRequest,
  CreateLostFoundReportResponse,
  BrowseListingsQuery,
  ApiResult,
  GetListingDetailResponse,
  GetYouReadModelResponse,
  ListClinicsResponse,
  ListingDetail,
  ListReviewQueueResponse,
  ListSavedListingsResponse,
  ToggleSavedListingResponse,
  UpdateListingModerationRequest,
  UpdateListingModerationResponse,
} from '../contracts/api'
import { apiResultOk } from '../contracts/api'
import { toReceivedAdoptionInquirySummary } from '../../features/inquiries/received-inquiry-projection'
import { createSeedClinicRepository } from '../../features/clinics/clinic-repository'
import { createClinicService } from '../../features/clinics/clinic-service'
import { createCreateInquiryUseCase } from '../../features/inquiries/create-inquiry'
import { createCreateListingUseCase } from '../domain/listings/create-listing'
import { createListingService } from '../domain/listings/listing-service'
import type { ListingAggregate } from '../domain/listings/listing-mapper'
import { toListingDetail } from '../domain/listings/listing-mapper'
import { createModerateListingUseCase } from '../domain/listings/moderate-listing'
import { createInMemoryListingRepository } from '../domain/listings/listing-repository'
import { createToggleSavedListingUseCase } from '../domain/listings/toggle-saved-listing'
import { createCreateReportUseCase } from '../../features/reports/create-report'
import { createUploadMediaUseCase, type UploadMediaResponse } from '../domain/media/upload-media'
import type { ValidateMediaUploadInput } from '../domain/media/media-upload-policy'
import { SEED_LISTINGS } from '../../data/seed'

const SEEDED_AT = '2026-07-02T08:00:00.000Z'
const PHOTO_KEY_PREFIX = 'seed/'

const ORGANIZATION_PRESETS = {
  'Maldives Cat Rescue': {
    id: 'org-cat-rescue',
    slug: 'maldives-cat-rescue',
    kind: 'rescue',
    areaLabel: 'Greater Malé',
    isVerified: true,
  },
  'Feline Welfare Organization': {
    id: 'org-feline-welfare',
    slug: 'feline-welfare-organization',
    kind: 'ngo',
    areaLabel: 'Greater Malé',
    isVerified: true,
  },
  'Zoophilist Society Maldives': {
    id: 'org-bird-rescue',
    slug: 'zoophilist-society-maldives',
    kind: 'ngo',
    areaLabel: 'Greater Malé',
    isVerified: true,
  },
} as const satisfies Record<string, { id: string; slug: string; kind: OrganizationRecord['kind']; areaLabel: string; isVerified: boolean }>

export interface HydratedAppShell {
  listings: ListingDetail[]
  clinics: ClinicSummary[]
}

export interface PrototypeBackendDeps {
  now?: () => string
  generateId?: (prefix: string) => string
  generateReferenceCode?: () => string
}

export interface PrototypeBackend {
  hydrateAppShell(input: { viewerId?: string }): HydratedAppShell
  listClinics(): ApiResult<ListClinicsResponse>
  listSavedListings(input: { viewerId: string }): ApiResult<ListSavedListingsResponse>
  getYouReadModel(input: { viewerId: string }): ApiResult<GetYouReadModelResponse>
  browseListings(input: { query: BrowseListingsQuery }): ApiResult<BrowseListingsResponse>
  listReviewQueue(): ApiResult<ListReviewQueueResponse>
  getListingDetail(input: { slugOrId: string }): ApiResult<GetListingDetailResponse>
  toggleSavedListing(input: { listingId: string; viewerId: string }): ApiResult<ToggleSavedListingResponse>
  createInquiry(input: { request: CreateInquiryRequest; viewerId: string }): ApiResult<CreateInquiryResponse>
  createListing(input: { request: CreateListingRequest; actorUserId: string | null }): ApiResult<CreateListingResponse>
  moderateListing(input: {
    listingId: string
    actorUserId: string
    request: UpdateListingModerationRequest
  }): ApiResult<UpdateListingModerationResponse>
  createReport(input: { request: CreateLostFoundReportRequest }): ApiResult<CreateLostFoundReportResponse>
  uploadMedia(input: ValidateMediaUploadInput): Promise<ApiResult<UploadMediaResponse>>
  getMediaObject(objectKey: string): { bytes: Uint8Array; contentType: string | null } | null
  getOrganizationName(id: string): string | null
  getTagId(label: string): string
}

export function createPrototypeBackend(deps: PrototypeBackendDeps = {}): PrototypeBackend {
  const organizations = new Map<string, OrganizationRecord>()
  const organizationsByName = new Map<string, OrganizationRecord>()
  const usersByName = new Map<string, UserRecord>()
  const tags = new Map<string, TagRecord>()
  const moderationEvents: ModerationEventRecord[] = []
  const inquiries: AdoptionInquiryRecord[] = []
  const reports: Array<{ id: string }> = []

  const now = deps.now ?? (() => new Date().toISOString())
  const generateId = deps.generateId ?? ((prefix: string) => `${prefix}-${crypto.randomUUID()}`)
  const generateReferenceCode = deps.generateReferenceCode ?? (() => `MV${Math.floor(1000 + Math.random() * 9000)}`)

  const listingRepository = createInMemoryListingRepository({
    listings: SEED_LISTINGS.map((listing) => seedListingToAggregate(listing)),
  })
  const listingService = createListingService({ repository: listingRepository })
  const clinicService = createClinicService({ repository: createSeedClinicRepository() })
  const toggleSavedListing = createToggleSavedListingUseCase({ repository: listingRepository })
  const moderateListing = createModerateListingUseCase({
    repository: listingRepository,
    now,
    generateEventId: () => generateId('mod-event'),
    saveModerationEvent: (event) => moderationEvents.push(event),
  })
  const createInquiry = createCreateInquiryUseCase({
    repository: listingRepository,
    now,
    generateId: () => generateId('inquiry'),
    saveInquiry: (inquiry) => inquiries.push(inquiry),
  })
  const createReport = createCreateReportUseCase({
    now,
    generateId: () => generateId('report'),
    generateReferenceCode,
    saveReport: (report) => reports.push({ id: report.id }),
  })
  const createListing = createCreateListingUseCase({
    repository: listingRepository,
    now,
    generateId: () => generateId('listing'),
    generateSlug: slugify,
  })
  const mediaObjects = new Map<string, { bytes: Uint8Array; contentType: string | null }>()
  const uploadMedia = createUploadMediaUseCase({
    mediaObjects: {
      async put({ objectKey, body, contentType }) {
        mediaObjects.set(objectKey, {
          bytes: body instanceof Uint8Array ? body : new Uint8Array(0),
          contentType: contentType ?? null,
        })
        return { objectKey, publicUrl: null }
      },
    },
    generateId: () => generateId('media'),
  })

  function seedListingToAggregate(listing: (typeof SEED_LISTINGS)[number]): ListingAggregate {
    const organization = listing.org ? ensureOrganization(listing.org) : null
    const listedByUser = listing.org ? null : ensureUser(listing.lister ?? 'Community member')
    const listingId = listing.id
    const species = listing.species
    return {
      listing: {
        id: listingId,
        slug: listingId,
        species,
        birdSpecies: listing.breed as BirdSpecies | undefined,
        name: listing.name,
        ageText: listing.age,
        sex: normalizeSex(listing.sex),
        areaLabel: listing.area,
        story: listing.story,
        status: listing.status ?? 'live',
        listedByUserId: listedByUser?.id ?? null,
        organizationId: organization?.id ?? null,
        publishedAt: listing.status === 'pending' ? null : SEEDED_AT,
        adoptedAt: listing.status === 'adopted' ? SEEDED_AT : null,
        rejectedAt: listing.status === 'rejected' ? SEEDED_AT : null,
        rejectedReason: null,
        createdAt: SEEDED_AT,
        updatedAt: SEEDED_AT,
      },
      images: listing.photo
        ? [
            {
              id: `${listingId}-image-0`,
              listingId,
              objectKey: `${PHOTO_KEY_PREFIX}${listingId}`,
              publicUrl: listing.photo,
              sortOrder: 0,
              width: null,
              height: null,
              createdAt: SEEDED_AT,
            },
          ]
        : [],
      tags: listing.tags.map((tagLabel) => ensureTag(tagLabel, species)),
      organization,
      listedByUser,
      savedByViewer: false,
    }
  }

  function ensureOrganization(name: string): OrganizationRecord {
    const existing = organizationsByName.get(name)
    if (existing) return existing
    const preset = ORGANIZATION_PRESETS[name as keyof typeof ORGANIZATION_PRESETS]
    const organization: OrganizationRecord = {
      id: preset?.id ?? `org-${slugify(name)}`,
      slug: preset?.slug ?? slugify(name),
      name,
      kind: preset?.kind ?? 'community',
      description: null,
      areaLabel: preset?.areaLabel ?? 'Greater Malé',
      contactEmail: null,
      contactPhone: null,
      isVerified: preset?.isVerified ?? false,
      verifiedAt: preset?.isVerified ? SEEDED_AT : null,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
    }
    organizations.set(organization.id, organization)
    organizationsByName.set(name, organization)
    return organization
  }

  /**
   * Resolves a user by id for the received-inquiry projection. Listings created
   * in-session fabricate their owner inside the use case rather than through
   * `ensureUser`, so fall back to scanning listing owners before giving up.
   */
  function findUserById(userId: string): UserRecord | null {
    for (const user of usersByName.values()) {
      if (user.id === userId) return user
    }
    for (const aggregate of listingRepository.listAll()) {
      if (aggregate.listedByUser?.id === userId) return aggregate.listedByUser
    }
    return null
  }

  function ensureUser(displayName: string): UserRecord {
    const existing = usersByName.get(displayName)
    if (existing) return existing
    const slug = slugify(displayName)
    const user: UserRecord = {
      id: `user-${slug}`,
      googleSub: `sub-${slug}`,
      email: `${slug}@example.com`,
      emailVerified: false,
      displayName,
      avatarUrl: null,
      role: 'user',
      banned: false,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
    }
    usersByName.set(displayName, user)
    return user
  }

  function ensureTag(label: string, species: 'cat' | 'bird'): TagRecord {
    const id = slugify(label)
    const existing = tags.get(id)
    if (existing) return existing
    const tag: TagRecord = {
      id,
      slug: id,
      label,
      speciesScope: species,
      createdAt: SEEDED_AT,
    }
    tags.set(id, tag)
    return tag
  }

  function hydrateAppShell(input: { viewerId?: string }): HydratedAppShell {
    const clinicsResult = clinicService.listClinics()
    return {
      listings: listingRepository.listAll(input.viewerId).map((aggregate) => toListingDetail(aggregate)),
      clinics: clinicsResult.ok ? clinicsResult.data.items : [],
    }
  }

  return {
    hydrateAppShell,
    listClinics() {
      return clinicService.listClinics()
    },
    listSavedListings(input) {
      return apiResultOk({
        items: listingRepository
          .listAll(input.viewerId)
          .filter((aggregate) => aggregate.savedByViewer)
          .map((aggregate) => toListingDetail(aggregate)),
      })
    },
    getYouReadModel(input) {
      return apiResultOk({
        sentAdoptionInquiries: inquiries
          .filter((inquiry) => inquiry.senderUserId === input.viewerId)
          .map((inquiry) => ({
            id: inquiry.id,
            listingId: inquiry.listingId,
            listingName: inquiry.listingNameSnapshot,
            recipientDisplayName: inquiry.recipientDisplayNameSnapshot,
            message: inquiry.message,
            status: inquiry.status,
            createdAt: inquiry.createdAt,
          })),
        receivedAdoptionInquiries: inquiries
          .filter((inquiry) => inquiry.recipientUserId === input.viewerId)
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
          .map((inquiry) => {
            const sender = findUserById(inquiry.senderUserId)
            return toReceivedAdoptionInquirySummary({
              ...inquiry,
              senderDisplayName: sender?.displayName ?? '',
              senderEmail: sender?.email ?? '',
            })
          }),
        ownedListings: listingRepository
          .listAll(input.viewerId)
          .filter((aggregate) => aggregate.listing.listedByUserId === input.viewerId)
          .map((aggregate) => toListingDetail(aggregate)),
      })
    },
    browseListings(input) {
      return listingService.browseListings(input.query)
    },
    listReviewQueue() {
      return apiResultOk({
        items: listingRepository
          .listAll()
          .filter((aggregate) => aggregate.listing.status === 'pending')
          .map((aggregate) => toListingDetail(aggregate)),
      })
    },
    getListingDetail(input) {
      return listingService.getListingDetail({ slugOrId: input.slugOrId })
    },
    toggleSavedListing(input) {
      return toggleSavedListing.execute({ listingId: input.listingId, viewerId: input.viewerId })
    },
    createInquiry(input) {
      return createInquiry.execute({
        listingId: input.request.listingId,
        message: input.request.message,
        senderUserId: input.viewerId,
      })
    },
    createListing(input) {
      const organization = input.request.organizationId ? organizations.get(input.request.organizationId) ?? null : null
      return createListing.execute({
        request: input.request,
        actorUserId: input.actorUserId,
        organization: organization
          ? {
              id: organization.id,
              slug: organization.slug,
              name: organization.name,
              kind: organization.kind,
              areaLabel: organization.areaLabel,
              isVerified: organization.isVerified,
            }
          : null,
        tags: input.request.tagIds
          .map((tagId) => tags.get(tagId))
          .filter((tag): tag is TagRecord => Boolean(tag)),
      })
    },
    moderateListing(input) {
      return moderateListing.execute({
        listingId: input.listingId,
        actorUserId: input.actorUserId,
        request: input.request,
      })
    },
    createReport(input) {
      return createReport.execute(input.request)
    },
    uploadMedia(input) {
      return uploadMedia.execute(input)
    },
    getMediaObject(objectKey) {
      return mediaObjects.get(objectKey) ?? null
    },
    getOrganizationName(id) {
      return organizations.get(id)?.name ?? null
    },
    getTagId(label) {
      return slugify(label)
    },
  }
}

function normalizeSex(value: string): 'male' | 'female' | 'unknown' {
  const lowered = value.toLowerCase()
  if (lowered === 'male') return 'male'
  if (lowered === 'female') return 'female'
  return 'unknown'
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
