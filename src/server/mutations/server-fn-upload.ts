import { apiResultErr, type ApiResult } from '../contracts/api'
import type { UploadMediaResponse } from '../domain/media/upload-media'
import type { AppMutationAdapter } from './mutation-adapter'

/**
 * Adapts the store-facing upload seam onto the FormData-based Start server
 * function, so uploads land in the Worker's durable media store instead of
 * the client runtime's in-memory map.
 */
export function createServerFnUploadMedia(
  callUploadMedia: (options: { data: FormData }) => Promise<ApiResult<UploadMediaResponse>>,
): AppMutationAdapter['uploadMedia'] {
  return async (input) => {
    const formData = new FormData()
    formData.set('kind', input.kind)
    formData.set('file', new File([input.bytes as BlobPart], 'upload', { type: input.contentType }))

    try {
      return await callUploadMedia({ data: formData })
    } catch {
      return apiResultErr('INTERNAL_ERROR', 'Upload failed. Check your connection and try again.')
    }
  }
}
