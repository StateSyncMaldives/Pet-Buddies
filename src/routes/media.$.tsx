import { createFileRoute } from '@tanstack/react-router'

import { serveMediaObject } from '../server/infra/media/serve-media-object'
import { getWorkerEnv } from '../server/infra/cloudflare/worker-env'

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
  const env = await getWorkerEnv()
  return env?.MEDIA_BUCKET ?? null
}
