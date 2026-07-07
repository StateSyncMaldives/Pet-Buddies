import { describe, expect, it, vi } from 'vitest'

import { apiResultOk, type ApiResult } from '../../../../src/server/contracts/api'
import type { UploadMediaResponse } from '../../../../src/server/domain/media/upload-media'
import { createServerFnUploadMedia } from '../../../../src/server/mutations/server-fn-upload'
import { JPEG_BYTES } from '../../../helpers/media-fixtures'

describe('server-fn upload media adapter', () => {
  it('packages the upload input as FormData and returns the server function result', async () => {
    const response: ApiResult<UploadMediaResponse> = apiResultOk({
      objectKey: 'listing-images/media-1.jpg',
      url: '/media/listing-images/media-1.jpg',
    })
    const callUploadMedia = vi.fn(async ({ data }: { data: FormData }) => {
      expect(data.get('kind')).toBe('listing-image')
      const file = data.get('file')
      expect(file).toBeInstanceOf(File)
      if (file instanceof File) {
        expect(file.type).toBe('image/jpeg')
        expect(new Uint8Array(await file.arrayBuffer())).toEqual(JPEG_BYTES)
      }
      return response
    })

    const uploadMedia = createServerFnUploadMedia(callUploadMedia)
    const result = await uploadMedia({
      kind: 'listing-image',
      contentType: 'image/jpeg',
      sizeBytes: JPEG_BYTES.byteLength,
      bytes: JPEG_BYTES,
    })

    expect(callUploadMedia).toHaveBeenCalledTimes(1)
    expect(result).toEqual(response)
  })

  it('surfaces a transport failure as a validation-style error instead of throwing', async () => {
    const uploadMedia = createServerFnUploadMedia(async () => {
      throw new Error('network down')
    })

    const result = await uploadMedia({
      kind: 'report-photo',
      contentType: 'image/jpeg',
      sizeBytes: JPEG_BYTES.byteLength,
      bytes: JPEG_BYTES,
    })

    expect(result.ok).toBe(false)
    if (result.ok === false) {
      expect(result.error.code).toBe('INTERNAL_ERROR')
    }
  })
})
