import { apiResultErr, type ApiResult } from '../contracts/api'
import type {
  CreateInquiryResponse,
  CreateListingResponse,
  CreateLostFoundReportResponse,
  ToggleSavedListingResponse,
  UpdateListingModerationResponse,
} from '../contracts/api'
import type {
  AppMutationAdapter,
  CreateInquiryInput,
  CreateListingInput,
  CreateReportInput,
  ToggleSavedListingInput,
  UpdateListingLifecycleInput,
} from './mutation-adapter'

type ServerFnCall<TInput, TResponse> = (options: { data: TInput }) => Promise<ApiResult<TResponse>>

/**
 * The dependencies are the Start server functions (from mutations.functions.ts),
 * each of which runs the mutation on the server against the durable backend.
 */
export interface ServerFnMutations {
  toggleSavedListing: ServerFnCall<ToggleSavedListingInput, ToggleSavedListingResponse>
  createInquiry: ServerFnCall<CreateInquiryInput, CreateInquiryResponse>
  createListing: ServerFnCall<CreateListingInput, CreateListingResponse>
  createReport: ServerFnCall<CreateReportInput, CreateLostFoundReportResponse>
  updateListingLifecycle: ServerFnCall<UpdateListingLifecycleInput, UpdateListingModerationResponse>
  uploadMedia: AppMutationAdapter['uploadMedia']
}

/**
 * Client-side mutation adapter that routes every write through a Start server
 * function, so it lands on the server's durable backend rather than a
 * browser-local in-memory instance. Network/handler failures surface as an
 * ApiResult error instead of throwing. See ADR 0008.
 */
export function createServerFnMutationAdapter(fns: ServerFnMutations): AppMutationAdapter {
  async function call<TInput, TResponse>(
    fn: ServerFnCall<TInput, TResponse>,
    data: TInput,
  ): Promise<ApiResult<TResponse>> {
    try {
      return await fn({ data })
    } catch {
      return apiResultErr('INTERNAL_ERROR', 'Something went wrong. Check your connection and try again.')
    }
  }

  return {
    toggleSavedListing: (input) => call(fns.toggleSavedListing, input),
    createInquiry: (input) => call(fns.createInquiry, input),
    createListing: (input) => call(fns.createListing, input),
    createReport: (input) => call(fns.createReport, input),
    updateListingLifecycle: (input) => call(fns.updateListingLifecycle, input),
    uploadMedia: fns.uploadMedia,
  }
}
