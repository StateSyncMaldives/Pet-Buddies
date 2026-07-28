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
import type { AsyncAppBackend } from '../runtime/app-backend'

export interface AppMutationAdapter {
  toggleSavedListing(input: ToggleSavedListingInput): Promise<ApiResult<ToggleSavedListingResponse>>
  createInquiry(input: CreateInquiryInput): Promise<ApiResult<CreateInquiryResponse>>
  createListing(input: CreateListingInput): Promise<ApiResult<CreateListingResponse>>
  createReport(input: CreateReportInput): Promise<ApiResult<CreateLostFoundReportResponse>>
  updateListingLifecycle(input: UpdateListingLifecycleInput): Promise<ApiResult<UpdateListingModerationResponse>>
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
  backend: AsyncAppBackend
  /** The acting viewer. Absent means anonymous — viewer-owned writes refuse. */
  viewerId?: string
  /** Accepted for call-site symmetry; the adapter itself never reads it. */
  moderatorId?: string
}

export function createRuntimeMutationAdapter({ backend, viewerId }: RuntimeMutationAdapterDeps): AppMutationAdapter {
  const requireViewerId = (): string => {
    if (!viewerId) throw new Error('A signed-in viewer is required for this write.')
    return viewerId
  }

  return {
    // `async` so a missing viewer surfaces as a rejected promise, not a
    // synchronous throw from a Promise-returning method.
    async toggleSavedListing(input) {
      return backend.toggleSavedListing({
        listingId: input.listingId,
        viewerId: requireViewerId(),
      })
    },
    // `async` so a missing viewer surfaces as a rejected promise, not a
    // synchronous throw from a Promise-returning method.
    async createInquiry(input) {
      return backend.createInquiry({
        request: input.request,
        viewerId: requireViewerId(),
      })
    },
    // `async` so a missing viewer surfaces as a rejected promise, not a
    // synchronous throw from a Promise-returning method.
    async createListing(input) {
      return backend.createListing({
        request: input.request,
        // The actor is the server-resolved viewer, never the client-supplied
        // value (which is a display name). Preserve only the authenticated vs.
        // anonymous signal. Prevents display-name-as-identity — see CONTEXT.md
        // Viewer and ADR 0008 §5.
        actorUserId: input.actorUserId === null ? null : requireViewerId(),
      })
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
