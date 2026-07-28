import type {
  ApiResult,
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
  GetYouReadModelResponse,
  ListingDetail,
  ListReviewQueueResponse,
  ListClinicsResponse,
  ListSavedListingsResponse,
  ToggleSavedListingResponse,
  UpdateListingModerationRequest,
  UpdateListingModerationResponse,
} from '../contracts/api'
import type { ValidateMediaUploadInput } from '../domain/media/media-upload-policy'
import type { UploadMediaResponse } from '../domain/media/upload-media'
import type { PrototypeBackend } from './prototype-backend'

export interface HydratedAppShell {
  listings: ListingDetail[]
  clinics: ClinicSummary[]
}

/**
 * The async application backend the router context exposes, defined as an
 * explicit port of exactly the reads and writes the SPA loaders, server
 * functions, and mutation adapter use — no longer derived from the full
 * in-memory `PrototypeBackend` surface. On the server it is the durable
 * D1-backed implementation. The in-memory facade below is retained for tests
 * and local harnesses only; production server runtime refuses to serve without
 * a D1 binding. See ADR 0008 / #7.
 */
export interface AsyncAppBackend {
  // ---- reads ----
  hydrateAppShell(input: { viewerId: string }): Promise<HydratedAppShell>
  listClinics(): Promise<ApiResult<ListClinicsResponse>>
  listSavedListings(input: { viewerId: string }): Promise<ApiResult<ListSavedListingsResponse>>
  getYouReadModel(input: { viewerId: string }): Promise<ApiResult<GetYouReadModelResponse>>
  browseListings(input: { query: BrowseListingsQuery }): Promise<ApiResult<BrowseListingsResponse>>
  listReviewQueue(): Promise<ApiResult<ListReviewQueueResponse>>
  getListingDetail(input: { slugOrId: string }): Promise<ApiResult<GetListingDetailResponse>>
  // ---- writes ----
  toggleSavedListing(input: { listingId: string; viewerId: string }): Promise<ApiResult<ToggleSavedListingResponse>>
  createInquiry(input: { request: CreateInquiryRequest; viewerId: string }): Promise<ApiResult<CreateInquiryResponse>>
  createListing(input: {
    request: CreateListingRequest
    actorUserId: string | null
  }): Promise<ApiResult<CreateListingResponse>>
  moderateListing(input: {
    listingId: string
    actorUserId: string
    request: UpdateListingModerationRequest
  }): Promise<ApiResult<UpdateListingModerationResponse>>
  createReport(input: { request: CreateLostFoundReportRequest }): Promise<ApiResult<CreateLostFoundReportResponse>>
  uploadMedia(input: ValidateMediaUploadInput): Promise<ApiResult<UploadMediaResponse>>
}

/** Wraps the synchronous in-memory prototype backend behind the async interface. */
export function createInMemoryAsyncBackend(backend: PrototypeBackend): AsyncAppBackend {
  return {
    async hydrateAppShell(input) {
      return backend.hydrateAppShell(input)
    },
    async listClinics() {
      return backend.listClinics()
    },
    async listSavedListings(input) {
      return backend.listSavedListings(input)
    },
    async getYouReadModel(input) {
      return backend.getYouReadModel(input)
    },
    async browseListings(input) {
      return backend.browseListings(input)
    },
    async listReviewQueue() {
      return backend.listReviewQueue()
    },
    async getListingDetail(input) {
      return backend.getListingDetail(input)
    },
    async toggleSavedListing(input) {
      return backend.toggleSavedListing(input)
    },
    async createInquiry(input) {
      return backend.createInquiry(input)
    },
    async createListing(input) {
      return backend.createListing(input)
    },
    async moderateListing(input) {
      return backend.moderateListing(input)
    },
    async createReport(input) {
      return backend.createReport(input)
    },
    uploadMedia(input) {
      return backend.uploadMedia(input)
    },
  }
}
