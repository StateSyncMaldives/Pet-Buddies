import { describe, expect, it } from 'vitest'

import { parseMediaUploadFormData } from '../../../../src/server/mutations/media-upload-form'

const JPEG_BYTES = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00])

describe('media upload form parsing', () => {
  it('parses a kind and file into a media upload input', async () => {
    const formData = new FormData()
    formData.set('kind', 'listing-image')
    formData.set('file', new File([JPEG_BYTES], 'mango.jpg', { type: 'image/jpeg' }))

    const result = await parseMediaUploadFormData(formData)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.kind).toBe('listing-image')
      expect(result.value.contentType).toBe('image/jpeg')
      expect(result.value.sizeBytes).toBe(JPEG_BYTES.byteLength)
      expect(Array.from(result.value.bytes)).toEqual(Array.from(JPEG_BYTES))
    }
  })

  it('rejects an unknown upload kind', async () => {
    const formData = new FormData()
    formData.set('kind', 'avatar')
    formData.set('file', new File([JPEG_BYTES], 'mango.jpg', { type: 'image/jpeg' }))

    const result = await parseMediaUploadFormData(formData)

    expect(result.ok).toBe(false)
    if (result.ok === false) {
      expect(result.error.code).toBe('VALIDATION_ERROR')
    }
  })

  it('rejects a missing file', async () => {
    const formData = new FormData()
    formData.set('kind', 'report-photo')

    const result = await parseMediaUploadFormData(formData)

    expect(result.ok).toBe(false)
    if (result.ok === false) {
      expect(result.error.code).toBe('VALIDATION_ERROR')
    }
  })
})
