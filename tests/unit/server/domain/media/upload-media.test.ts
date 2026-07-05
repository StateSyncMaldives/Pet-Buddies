import { describe, expect, it, vi } from 'vitest'

import { createUploadMediaUseCase } from '../../../../../src/server/domain/media/upload-media'

const JPEG_BYTES = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00])

describe('upload media', () => {
  it('stores a valid listing image under a generated managed key and returns its url', async () => {
    const put = vi.fn(async ({ objectKey }: { objectKey: string }) => ({ objectKey, publicUrl: null }))
    const useCase = createUploadMediaUseCase({
      mediaObjects: { put },
      generateId: () => 'media-1',
    })

    const result = await useCase.execute({
      kind: 'listing-image',
      contentType: 'image/jpeg',
      sizeBytes: JPEG_BYTES.byteLength,
      bytes: JPEG_BYTES,
    })

    expect(put).toHaveBeenCalledWith({
      objectKey: 'listing-images/media-1.jpg',
      body: JPEG_BYTES,
      contentType: 'image/jpeg',
    })
    expect(result).toEqual({
      ok: true,
      data: {
        objectKey: 'listing-images/media-1.jpg',
        url: '/media/listing-images/media-1.jpg',
      },
    })
  })

  it('prefers the store-derived public url when the store is configured with one', async () => {
    const useCase = createUploadMediaUseCase({
      mediaObjects: {
        put: async ({ objectKey }) => ({
          objectKey,
          publicUrl: `https://media.example.com/${objectKey}`,
        }),
      },
      generateId: () => 'media-3',
    })

    const result = await useCase.execute({
      kind: 'listing-image',
      contentType: 'image/jpeg',
      sizeBytes: JPEG_BYTES.byteLength,
      bytes: JPEG_BYTES,
    })

    expect(result).toEqual({
      ok: true,
      data: {
        objectKey: 'listing-images/media-3.jpg',
        url: 'https://media.example.com/listing-images/media-3.jpg',
      },
    })
  })

  it('rejects an invalid upload without touching the store', async () => {
    const put = vi.fn()
    const useCase = createUploadMediaUseCase({
      mediaObjects: { put },
      generateId: () => 'media-2',
    })

    const result = await useCase.execute({
      kind: 'report-photo',
      contentType: 'image/png',
      sizeBytes: JPEG_BYTES.byteLength,
      bytes: JPEG_BYTES,
    })

    expect(put).not.toHaveBeenCalled()
    expect(result.ok).toBe(false)
    if (result.ok === false) {
      expect(result.error.code).toBe('VALIDATION_ERROR')
    }
  })
})
