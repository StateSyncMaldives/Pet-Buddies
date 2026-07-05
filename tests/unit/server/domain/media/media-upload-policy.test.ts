import { describe, expect, it } from 'vitest'

import { validateMediaUpload } from '../../../../../src/server/domain/media/media-upload-policy'

const JPEG_BYTES = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00])
const PNG_BYTES = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d])
const WEBP_BYTES = Uint8Array.from([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20,
])

describe('media upload policy', () => {
  it('accepts a JPEG whose bytes match the declared content type', () => {
    const result = validateMediaUpload({
      kind: 'listing-image',
      contentType: 'image/jpeg',
      sizeBytes: JPEG_BYTES.byteLength,
      bytes: JPEG_BYTES,
    })

    expect(result).toEqual({
      ok: true,
      value: { contentType: 'image/jpeg', extension: 'jpg' },
    })
  })

  it('accepts a PNG and a WebP with their canonical extensions', () => {
    expect(
      validateMediaUpload({
        kind: 'report-photo',
        contentType: 'image/png',
        sizeBytes: PNG_BYTES.byteLength,
        bytes: PNG_BYTES,
      }),
    ).toEqual({ ok: true, value: { contentType: 'image/png', extension: 'png' } })

    expect(
      validateMediaUpload({
        kind: 'listing-image',
        contentType: 'image/webp',
        sizeBytes: WEBP_BYTES.byteLength,
        bytes: WEBP_BYTES,
      }),
    ).toEqual({ ok: true, value: { contentType: 'image/webp', extension: 'webp' } })
  })

  it('rejects a content type outside the allowlist', () => {
    const result = validateMediaUpload({
      kind: 'listing-image',
      contentType: 'image/gif',
      sizeBytes: 100,
      bytes: Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]),
    })

    expect(result.ok).toBe(false)
    if (result.ok === false) {
      expect(result.error.code).toBe('VALIDATION_ERROR')
      expect(result.error.message).toMatch(/JPEG, PNG, or WebP/)
    }
  })

  it('rejects a file over the 5 MB ceiling', () => {
    const result = validateMediaUpload({
      kind: 'listing-image',
      contentType: 'image/jpeg',
      sizeBytes: 5 * 1024 * 1024 + 1,
      bytes: JPEG_BYTES,
    })

    expect(result.ok).toBe(false)
    if (result.ok === false) {
      expect(result.error.code).toBe('VALIDATION_ERROR')
      expect(result.error.message).toMatch(/5 MB/)
    }
  })

  it('rejects an empty file', () => {
    const result = validateMediaUpload({
      kind: 'report-photo',
      contentType: 'image/png',
      sizeBytes: 0,
      bytes: new Uint8Array(0),
    })

    expect(result.ok).toBe(false)
    if (result.ok === false) {
      expect(result.error.code).toBe('VALIDATION_ERROR')
    }
  })

  it('rejects a spoofed content type whose bytes are a different format', () => {
    const result = validateMediaUpload({
      kind: 'listing-image',
      contentType: 'image/png',
      sizeBytes: JPEG_BYTES.byteLength,
      bytes: JPEG_BYTES,
    })

    expect(result.ok).toBe(false)
    if (result.ok === false) {
      expect(result.error.code).toBe('VALIDATION_ERROR')
      expect(result.error.message).toMatch(/does not match/)
    }
  })

  it('rejects bytes that match no supported image signature', () => {
    const result = validateMediaUpload({
      kind: 'listing-image',
      contentType: 'image/jpeg',
      sizeBytes: 4,
      bytes: Uint8Array.from([0x4d, 0x5a, 0x90, 0x00]),
    })

    expect(result.ok).toBe(false)
    if (result.ok === false) {
      expect(result.error.code).toBe('VALIDATION_ERROR')
    }
  })
})
