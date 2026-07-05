import { createFileRoute } from '@tanstack/react-router'

import { serveMediaObject } from '../server/http/media/get-media-object'
import type { PetBuddiesCloudflareBindings } from '../server/infra/cloudflare/bindings'

export const Route = createFileRoute('/media/$')({
  server: {
    handlers: {
      GET: async ({ params }) =>
        serveMediaObject({
          objectKey: params._splat ?? '',
          getObject: async (objectKey) => {
            const bucket = await getMediaBucket()
            if (!bucket) {
              return null
            }

            const object = await bucket.get(objectKey)
            if (!object) {
              return null
            }

            return {
              bytes: new Uint8Array(await object.arrayBuffer()),
              contentType: object.httpMetadata?.contentType ?? null,
            }
          },
        }),
    },
  },
})

async function getMediaBucket(): Promise<R2Bucket | null> {
  try {
    // Resolved by workerd at runtime; unavailable outside the Worker (vitest, plain dev).
    const workers = (await import(/* @vite-ignore */ 'cloudflare:workers')) as {
      env?: Partial<PetBuddiesCloudflareBindings>
    }
    return workers.env?.MEDIA_BUCKET ?? null
  } catch {
    return null
  }
}
