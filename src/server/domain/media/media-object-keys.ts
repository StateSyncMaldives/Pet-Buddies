import type { MediaUploadKind, ValidatedMediaUpload } from './media-upload-policy'

export const KIND_PREFIXES: Record<MediaUploadKind, string> = {
  'listing-image': 'listing-images',
  'report-photo': 'report-photos',
}

const KEY_ID_PATTERN = /^[a-z0-9-]+$/
const ALLOWED_EXTENSIONS = new Set<string>(['jpg', 'png', 'webp'])

export function buildMediaObjectKey(input: {
  kind: MediaUploadKind
  id: string
  extension: ValidatedMediaUpload['extension']
}): string {
  return `${KIND_PREFIXES[input.kind]}/${input.id}.${input.extension}`
}

export function isAdmissibleMediaObjectKey(kind: MediaUploadKind, objectKey: string): boolean {
  const prefix = `${KIND_PREFIXES[kind]}/`
  if (!objectKey.startsWith(prefix)) {
    return false
  }

  const fileName = objectKey.slice(prefix.length)
  const dotIndex = fileName.lastIndexOf('.')
  if (dotIndex <= 0) {
    return false
  }

  const id = fileName.slice(0, dotIndex)
  const extension = fileName.slice(dotIndex + 1)

  return KEY_ID_PATTERN.test(id) && ALLOWED_EXTENSIONS.has(extension)
}
