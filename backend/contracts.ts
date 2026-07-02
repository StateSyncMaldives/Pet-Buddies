import type {
  BirdSpecies,
  GlobalRole,
  InquiryStatus,
  ListingStatus,
  ModerationAction,
  OrganizationKind,
  ReportKind,
  ReportStatus,
  Sex,
  Species,
} from '../src/server/contracts/api'

export type {
  ApiError,
  ApiErrorCode,
  ApiFailure,
  ApiResult,
  ApiSuccess,
  BirdSpecies,
  BrowseListingsQuery,
  BrowseListingsResponse,
  ClinicSummary,
  CreateInquiryRequest,
  CreateInquiryResponse,
  CreateListingRequest,
  CreateListingResponse,
  CreateLostFoundReportRequest,
  CreateLostFoundReportResponse,
  GetListingDetailResponse,
  GlobalRole,
  InquiryStatus,
  ListClinicsResponse,
  ListingDetail,
  ListingImage,
  ListingStatus,
  ListingSummary,
  ModerationAction,
  OrganizationKind,
  OrganizationMemberRole,
  OrganizationSummary,
  PageInfo,
  ReportKind,
  ReportStatus,
  Sex,
  Species,
  ToggleSavedListingResponse,
  UpdateListingModerationRequest,
  UpdateListingModerationResponse,
} from '../src/server/contracts/api'

export interface UserRecord {
  id: string
  googleSub: string
  email: string
  displayName: string
  avatarUrl?: string | null
  globalRole: GlobalRole
  createdAt: string
  updatedAt: string
}

export interface OrganizationRecord {
  id: string
  slug: string
  name: string
  kind: OrganizationKind
  description?: string | null
  areaLabel?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
  isVerified: boolean
  verifiedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface ListingRecord {
  id: string
  slug: string
  species: Species
  birdSpecies?: BirdSpecies | null
  name: string
  ageText: string
  sex: Sex
  areaLabel: string
  story: string
  status: ListingStatus
  listedByUserId?: string | null
  organizationId?: string | null
  publishedAt?: string | null
  adoptedAt?: string | null
  rejectedAt?: string | null
  rejectedReason?: string | null
  createdAt: string
  updatedAt: string
}

export interface ListingImageRecord {
  id: string
  listingId: string
  objectKey: string
  publicUrl?: string | null
  sortOrder: number
  width?: number | null
  height?: number | null
  createdAt: string
}

export interface TagRecord {
  id: string
  slug: string
  label: string
  speciesScope: Species | 'both'
  createdAt: string
}

export interface AdoptionInquiryRecord {
  id: string
  listingId: string
  senderUserId: string
  recipientUserId?: string | null
  recipientOrganizationId?: string | null
  recipientDisplayNameSnapshot: string
  listingNameSnapshot: string
  message: string
  status: InquiryStatus
  createdAt: string
  updatedAt: string
}

export interface LostFoundReportRecord {
  id: string
  referenceCode: string
  reportKind: ReportKind
  species: Species
  birdSpecies?: BirdSpecies | null
  reporterUserId?: string | null
  reporterName?: string | null
  reporterEmail?: string | null
  areaLabel: string
  description: string
  photoObjectKey?: string | null
  routedToOrganizationId: string
  status: ReportStatus
  createdAt: string
  updatedAt: string
}

export interface ClinicRecord {
  id: string
  slug: string
  name: string
  areaLabel: string
  address?: string | null
  phone?: string | null
  note?: string | null
  mapsUrl?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ModerationEventRecord {
  id: string
  listingId: string
  actorUserId: string
  action: ModerationAction
  reason?: string | null
  metadataJson?: string | null
  createdAt: string
}
