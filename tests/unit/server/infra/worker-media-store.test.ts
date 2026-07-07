import { describe, expect, it, vi } from 'vitest'

import type { PetBuddiesCloudflareBindings } from '../../../../src/server/infra/cloudflare/bindings'
import { resolveWorkerMediaStore } from '../../../../src/server/infra/media/worker-media-store'

describe('worker media store resolution', () => {
  it('returns an R2-backed store when the MEDIA_BUCKET binding is present', async () => {
    const bucket = {
      put: vi.fn<Pick<R2Bucket, 'put'>['put']>().mockResolvedValue({} as R2Object),
      head: vi.fn<Pick<R2Bucket, 'head'>['head']>().mockResolvedValue(null),
      get: vi.fn<Pick<R2Bucket, 'get'>['get']>().mockResolvedValue(null),
    }

    const store = resolveWorkerMediaStore({ MEDIA_BUCKET: bucket as unknown as R2Bucket })

    expect(store).not.toBeNull()
    await store?.put({ objectKey: 'listing-images/media-1.jpg', body: 'bytes', contentType: 'image/jpeg' })
    expect(bucket.put).toHaveBeenCalledWith('listing-images/media-1.jpg', 'bytes', {
      httpMetadata: { contentType: 'image/jpeg' },
    })
  })

  it('returns null when the binding is missing', () => {
    expect(resolveWorkerMediaStore(undefined)).toBeNull()
    expect(resolveWorkerMediaStore(null)).toBeNull()
    expect(resolveWorkerMediaStore({} as Partial<PetBuddiesCloudflareBindings>)).toBeNull()
  })
})
