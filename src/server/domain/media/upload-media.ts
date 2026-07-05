import type { ApiResult } from '../../contracts/api'
import type { MediaObjectStore } from '../../infra/media/r2-media-store'
import { buildMediaObjectKey } from './media-object-keys'
import { resolveMediaUrl } from './media-url'
import { validateMediaUpload, type ValidateMediaUploadInput } from './media-upload-policy'

export interface UploadMediaResponse {
  objectKey: string
  url: string
}

export interface UploadMediaUseCase {
  execute(input: ValidateMediaUploadInput): Promise<ApiResult<UploadMediaResponse>>
}

export function createUploadMediaUseCase(dependencies: {
  mediaObjects: Pick<MediaObjectStore, 'put'>
  generateId: () => string
}): UploadMediaUseCase {
  return {
    async execute(input) {
      const validated = validateMediaUpload(input)
      if (validated.ok === false) {
        return validated
      }

      const objectKey = buildMediaObjectKey({
        kind: input.kind,
        id: dependencies.generateId(),
        extension: validated.value.extension,
      })

      const stored = await dependencies.mediaObjects.put({
        objectKey,
        body: input.bytes,
        contentType: validated.value.contentType,
      })

      return {
        ok: true,
        data: {
          objectKey: stored.objectKey,
          url: stored.publicUrl ?? resolveMediaUrl({ objectKey: stored.objectKey }) ?? stored.objectKey,
        },
      }
    },
  }
}
