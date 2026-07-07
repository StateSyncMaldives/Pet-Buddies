/**
 * Canonical magic-byte media fixtures shared across the test suite.
 * The byte values are load-bearing: the media upload policy sniffs these
 * signatures, so tests must all agree on the same fixtures.
 */

/** FF D8 FF E0 .. "JFIF" — a minimal JPEG signature. */
export const JPEG_BYTES = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00])

/** 89 "PNG" 0D 0A 1A 0A — a minimal PNG signature. */
export const PNG_BYTES = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d])

/** "RIFF" .... "WEBP" "VP8 " — a minimal WebP signature. */
export const WEBP_BYTES = Uint8Array.from([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20,
])

export function jpegFile(name = 'mango.jpg'): File {
  return new File([JPEG_BYTES], name, { type: 'image/jpeg' })
}
