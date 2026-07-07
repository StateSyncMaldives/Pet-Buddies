import { apiResultErr, type ApiError } from '../../contracts/api'

export type MediaUploadKind = 'listing-image' | 'report-photo'
export type AllowedMediaContentType = 'image/jpeg' | 'image/png' | 'image/webp'

export const MEDIA_UPLOAD_MAX_BYTES = 5 * 1024 * 1024
export const MEDIA_UPLOAD_MAX_LABEL = `${MEDIA_UPLOAD_MAX_BYTES / (1024 * 1024)} MB`

export interface ValidateMediaUploadInput {
  kind: MediaUploadKind
  contentType: string
  sizeBytes: number
  bytes: Uint8Array
}

export interface ValidatedMediaUpload {
  contentType: AllowedMediaContentType
  extension: 'jpg' | 'png' | 'webp'
}

export type MediaUploadPolicyResult =
  | { ok: true; value: ValidatedMediaUpload }
  | { ok: false; error: ApiError }

const ALLOWED_TYPES: Record<AllowedMediaContentType, ValidatedMediaUpload['extension']> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export function validateMediaUpload(input: ValidateMediaUploadInput): MediaUploadPolicyResult {
  const extension = ALLOWED_TYPES[input.contentType as AllowedMediaContentType]
  if (!extension) {
    return validationError('Only JPEG, PNG, or WebP images are allowed.')
  }

  if (input.sizeBytes <= 0) {
    return validationError('The file is empty.')
  }

  if (input.sizeBytes > MEDIA_UPLOAD_MAX_BYTES) {
    return validationError(`The file is larger than the ${MEDIA_UPLOAD_MAX_LABEL} limit.`)
  }

  const detectedType = detectImageContentType(input.bytes)
  if (detectedType !== input.contentType) {
    return validationError('The file content does not match the declared image type.')
  }

  return {
    ok: true,
    value: {
      contentType: input.contentType as AllowedMediaContentType,
      extension,
    },
  }
}

function detectImageContentType(bytes: Uint8Array): AllowedMediaContentType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return 'image/jpeg'
  }

  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'image/png'
  }

  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && matchesAt(bytes, 8, [0x57, 0x45, 0x42, 0x50])) {
    return 'image/webp'
  }

  return null
}

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return matchesAt(bytes, 0, signature)
}

function matchesAt(bytes: Uint8Array, offset: number, signature: number[]): boolean {
  if (bytes.byteLength < offset + signature.length) {
    return false
  }

  return signature.every((byte, index) => bytes[offset + index] === byte)
}

function validationError(message: string): MediaUploadPolicyResult {
  return apiResultErr('VALIDATION_ERROR', message)
}
