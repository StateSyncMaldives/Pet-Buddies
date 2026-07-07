import type {
  ApiResult,
  CreateInquiryRequest,
  CreateInquiryResponse,
  CreateListingRequest,
  CreateListingResponse,
  CreateLostFoundReportRequest,
  CreateLostFoundReportResponse,
  ToggleSavedListingResponse,
  UpdateListingModerationRequest,
  UpdateListingModerationResponse,
} from '../contracts/api'
import type { ValidateMediaUploadInput } from '../domain/media/media-upload-policy'
import type { UploadMediaResponse } from '../domain/media/upload-media'
import type { PrototypeBackend } from '../runtime/prototype-backend'

export interface AppMutationAdapter {
  toggleSavedListing(input: ToggleSavedListingInput): ApiResult<ToggleSavedListingResponse>
  createInquiry(input: CreateInquiryInput): ApiResult<CreateInquiryResponse>
  createListing(input: CreateListingInput): ApiResult<CreateListingResponse>
  createReport(input: CreateReportInput): ApiResult<CreateLostFoundReportResponse>
  updateListingLifecycle(input: UpdateListingLifecycleInput): ApiResult<UpdateListingModerationResponse>
  uploadMedia(input: ValidateMediaUploadInput): Promise<ApiResult<UploadMediaResponse>>
}

export interface ToggleSavedListingInput {
  listingId: string
}

export interface CreateInquiryInput {
  request: CreateInquiryRequest
}

export interface CreateListingInput {
  actorUserId: string | null
  request: CreateListingRequest
}

export interface CreateReportInput {
  request: CreateLostFoundReportRequest
}

export interface UpdateListingLifecycleInput {
  listingId: string
  actorUserId: string
  request: UpdateListingModerationRequest
}

export interface RuntimeMutationAdapterDeps {
  backend: PrototypeBackend
  viewerId: string
  /** Accepted for call-site symmetry; the adapter itself never reads it. */
  moderatorId?: string
}

export function createRuntimeMutationAdapter({ backend, viewerId }: RuntimeMutationAdapterDeps): AppMutationAdapter {
  return {
    toggleSavedListing(input) {
      return backend.toggleSavedListing({
        listingId: input.listingId,
        viewerId,
      })
    },
    createInquiry(input) {
      return backend.createInquiry({
        request: input.request,
        viewerId,
      })
    },
    createListing(input) {
      return backend.createListing(input)
    },
    createReport(input) {
      return backend.createReport(input)
    },
    updateListingLifecycle(input) {
      return backend.moderateListing(input)
    },
    uploadMedia(input) {
      return backend.uploadMedia(input)
    },
  }
}
