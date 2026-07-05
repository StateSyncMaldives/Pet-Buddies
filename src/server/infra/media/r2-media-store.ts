export interface PutMediaObjectInput {
  objectKey: string
  body: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob | null
  contentType?: string
}

export interface StoredMediaObject {
  objectKey: string
  publicUrl: string | null
}

export interface MediaObjectStore {
  put(input: PutMediaObjectInput): Promise<StoredMediaObject>
  head(objectKey: string): Promise<R2Object | null>
  get(objectKey: string): Promise<R2ObjectBody | null>
  toPublicUrl(objectKey: string): string | null
}

export function createR2MediaObjectStore(input: {
  bucket: Pick<R2Bucket, 'put' | 'head' | 'get'>
  publicBaseUrl?: string
}): MediaObjectStore {
  const publicBaseUrl = input.publicBaseUrl

  return {
    async put({ objectKey, body, contentType }) {
      await input.bucket.put(objectKey, body, {
        httpMetadata: contentType ? { contentType } : undefined,
      })

      return {
        objectKey,
        publicUrl: toPublicUrl(objectKey, publicBaseUrl),
      }
    },
    head(objectKey) {
      return input.bucket.head(objectKey)
    },
    get(objectKey) {
      return input.bucket.get(objectKey)
    },
    toPublicUrl(objectKey) {
      return toPublicUrl(objectKey, publicBaseUrl)
    },
  }
}

function toPublicUrl(objectKey: string, publicBaseUrl?: string): string | null {
  if (!publicBaseUrl) {
    return null
  }

  const base = publicBaseUrl.endsWith('/') ? publicBaseUrl : `${publicBaseUrl}/`
  return new URL(objectKey.split('/').map(encodeURIComponent).join('/'), base).toString()
}
