import type { ApiError } from '../contracts/api'
import type { MediaUploadKind, ValidateMediaUploadInput } from '../domain/media/media-upload-policy'

const UPLOAD_KINDS: MediaUploadKind[] = ['listing-image', 'report-photo']

export type ParsedMediaUploadForm =
  | { ok: true; value: ValidateMediaUploadInput }
  | { ok: false; error: ApiError }

export async function parseMediaUploadFormData(formData: FormData): Promise<ParsedMediaUploadForm> {
  const kind = formData.get('kind')
  if (typeof kind !== 'string' || !UPLOAD_KINDS.includes(kind as MediaUploadKind)) {
    return formError('Unknown upload kind.')
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return formError('No file was provided.')
  }

  return {
    ok: true,
    value: {
      kind: kind as MediaUploadKind,
      contentType: file.type,
      sizeBytes: file.size,
      bytes: new Uint8Array(await file.arrayBuffer()),
    },
  }
}

function formError(message: string): ParsedMediaUploadForm {
  return {
    ok: false,
    error: {
      code: 'VALIDATION_ERROR',
      message,
    },
  }
}
