import { isManagedMediaObjectKey } from '../../domain/media/media-url'

export interface StoredMediaBytes {
  bytes: Uint8Array
  contentType: string | null
}

export async function serveMediaObject(input: {
  objectKey: string
  getObject: (objectKey: string) => Promise<StoredMediaBytes | null> | StoredMediaBytes | null
}): Promise<Response> {
  if (!isManagedMediaObjectKey(input.objectKey)) {
    return new Response('Not found', { status: 404 })
  }

  const stored = await input.getObject(input.objectKey)
  if (!stored) {
    return new Response('Not found', { status: 404 })
  }

  return new Response(stored.bytes.slice().buffer, {
    status: 200,
    headers: {
      'content-type': stored.contentType ?? 'application/octet-stream',
      // Managed keys are unique per upload, so the bytes never change.
      'cache-control': 'public, max-age=31536000, immutable',
    },
  })
}
