export type GlobalRole = 'user' | 'moderator' | 'admin'
export type OrganizationKind = 'rescue' | 'ngo' | 'partner' | 'community'
export type OrganizationMemberRole = 'member' | 'admin' | 'listing_manager'
export type Species = 'cat' | 'bird'

// Legally-importable pet birds only (PRD §7/§11).
export const BIRD_SPECIES = ['Budgerigar', 'Cockatiel', 'Lovebird', 'Finch', 'Canary'] as const
export type BirdSpecies = (typeof BIRD_SPECIES)[number]

export function isBirdSpecies(value: unknown): value is BirdSpecies {
  return typeof value === 'string' && (BIRD_SPECIES as readonly string[]).includes(value)
}
export type Sex = 'male' | 'female' | 'unknown'
export type ListingStatus = 'pending' | 'live' | 'rejected' | 'adopted'
export type InquiryStatus = 'awaiting_reply' | 'replied' | 'withdrawn' | 'closed'
export type ReportKind = 'lost' | 'found'
export type ReportStatus = 'submitted' | 'reviewing' | 'resolved' | 'closed'
export type ModerationAction = 'submitted' | 'approved' | 'rejected' | 'adopted' | 'restored'

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'

export interface ApiError {
  code: ApiErrorCode
  message: string
  fieldErrors?: Record<string, string[]>
}

export type ApiSuccess<T> = {
  ok: true
  data: T
}

export type ApiFailure = {
  ok: false
  error: ApiError
}

export type ApiResult<T> = ApiSuccess<T> | ApiFailure

export interface PageInfo {
  nextCursor?: string | null
}

export interface OrganizationSummary {
  id: string
  slug: string
  name: string
  kind: OrganizationKind
  areaLabel?: string | null
  isVerified: boolean
}

export interface ListingImage {
  id: string
  url: string
  width?: number | null
  height?: number | null
  sortOrder: number
}

export interface ListingSummary {
  id: string
  slug: string
  species: Species
  birdSpecies?: BirdSpecies | null
  name: string
  ageText: string
  sex: Sex
  areaLabel: string
  status: Extract<ListingStatus, 'live' | 'pending' | 'adopted'>
  primaryImageUrl?: string | null
  tags: string[]
  organization?: OrganizationSummary | null
  savedByViewer: boolean
  publishedAt?: string | null
}

export interface ListingDetail extends ListingSummary {
  story: string
  images: ListingImage[]
  listedBy: {
    kind: 'user' | 'organization'
    id: string
    displayName: string
  }
  inquiryAllowed: boolean
}

export interface ClinicSummary {
  id: string
  slug: string
  name: string
  areaLabel: string
  phone?: string | null
  note?: string | null
  mapsUrl?: string | null
  services: string[]
}

export interface BrowseListingsQuery {
  species?: Species
  tagSlugs?: string[]
  areaLabel?: string
  search?: string
  cursor?: string
  limit?: number
}

export interface BrowseListingsResponse {
  items: ListingSummary[]
  pageInfo: PageInfo
  availableTags: Array<{
    slug: string
    label: string
    speciesScope: Species | 'both'
  }>
}

export interface GetListingDetailResponse {
  item: ListingDetail
}

export interface ListReviewQueueResponse {
  items: ListingDetail[]
}

export interface CreateListingRequest {
  species: Species
  birdSpecies?: BirdSpecies
  name: string
  ageText: string
  sex?: Sex
  areaLabel: string
  story: string
  tagIds: string[]
  imageObjectKeys: string[]
  organizationId?: string
}

export interface CreateListingResponse {
  listing: ListingDetail
}

export interface UpdateListingModerationRequest {
  action: Extract<ModerationAction, 'approved' | 'rejected' | 'adopted' | 'restored'>
  reason?: string
}

export interface UpdateListingModerationResponse {
  listing: ListingDetail
  moderationEventId: string
}

export interface CreateInquiryRequest {
  listingId: string
  message: string
}

export interface CreateInquiryResponse {
  inquiry: {
    id: string
    listingId: string
    status: InquiryStatus
    createdAt: string
  }
}

export interface CreateLostFoundReportRequest {
  reportKind: ReportKind
  species: Species
  birdSpecies?: BirdSpecies
  reporterName?: string
  reporterEmail?: string
  areaLabel: string
  description: string
  photoObjectKey?: string
}

export interface CreateLostFoundReportResponse {
  report: {
    id: string
    referenceCode: string
    routedToOrganizationId: string
    status: ReportStatus
    createdAt: string
  }
}

export interface ToggleSavedListingResponse {
  listingId: string
  saved: boolean
}

export interface ListClinicsResponse {
  items: ClinicSummary[]
}

export interface ListSavedListingsResponse {
  items: ListingDetail[]
}

export interface SentAdoptionInquirySummary {
  id: string
  listingId: string
  listingName: string
  recipientDisplayName: string
  message: string
  status: InquiryStatus
  createdAt: string
}

export interface GetYouReadModelResponse {
  sentAdoptionInquiries: SentAdoptionInquirySummary[]
  ownedListings: ListingDetail[]
}

export const API_RESULT_READY = 'server-contracts-ready'

export const apiResultOk = <T>(data: T): ApiResult<T> => ({
  ok: true,
  data,
})

export const apiResultErr = (
  code: ApiErrorCode,
  message: string,
  fieldErrors?: Record<string, string[]>,
): ApiFailure => ({
  ok: false,
  error: {
    code,
    message,
    ...(fieldErrors ? { fieldErrors } : {}),
  },
})
