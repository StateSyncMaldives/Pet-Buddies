import { drizzle } from 'drizzle-orm/d1'
import { Miniflare } from 'miniflare'
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest'

import {
  createCloudflareInfrastructure,
  type PetBuddiesCloudflareBindings,
} from '../../../../src/server/infra/cloudflare/bindings'
import { createDrizzleDatabaseFromD1 } from '../../../../src/server/infra/db/d1-drizzle'
import { createR2MediaObjectStore } from '../../../../src/server/infra/media/r2-media-store'
import { createUploadMediaUseCase } from '../../../../src/server/domain/media/upload-media'
import { isAdmissibleMediaObjectKey } from '../../../../src/server/domain/media/media-object-keys'
import * as schema from '../../../../src/server/infra/db/schema'
import { JPEG_BYTES } from '../../../helpers/media-fixtures'

let miniflare: Miniflare | undefined

afterEach(async () => {
  await miniflare?.dispose()
  miniflare = undefined
})

describe('Cloudflare binding wiring', () => {
  it('creates the persistence and media adapters from the Worker bindings', async () => {
    miniflare = new Miniflare({
      modules: true,
      script: `export default { fetch() { return new Response("ok") } }`,
      d1Databases: { DB: 'pet-buddies-binding-test-db' },
      r2Buckets: ['MEDIA_BUCKET'],
    })

    const infrastructure = createCloudflareInfrastructure({
      env: (await miniflare.getBindings()) as PetBuddiesCloudflareBindings,
      mediaPublicBaseUrl: 'https://media.example.com/pet-buddies',
    })

    expect(infrastructure.database).toEqual(expect.objectContaining({ $client: expect.anything() }))
    expect(infrastructure.mediaObjects.toPublicUrl('listing images/mango 1.jpg')).toBe(
      'https://media.example.com/pet-buddies/listing%20images/mango%201.jpg',
    )
  })

  it('creates the typed Drizzle database from the D1 binding', async () => {
    miniflare = new Miniflare({
      modules: true,
      script: `export default { fetch() { return new Response("ok") } }`,
      d1Databases: { DB: 'pet-buddies-drizzle-binding-test-db' },
    })

    const db = createDrizzleDatabaseFromD1(await miniflare.getD1Database('DB'))

    expect(db).toEqual(expect.objectContaining({ $client: expect.anything() }))
    expectTypeOf(db).toEqualTypeOf<ReturnType<typeof drizzle<typeof schema>>>()
  })

  it('runs the media upload path end to end against the R2 binding', async () => {
    miniflare = new Miniflare({
      modules: true,
      script: `export default { fetch() { return new Response("ok") } }`,
      d1Databases: { DB: 'pet-buddies-upload-test-db' },
      r2Buckets: ['MEDIA_BUCKET'],
    })

    const infrastructure = createCloudflareInfrastructure({
      env: (await miniflare.getBindings()) as PetBuddiesCloudflareBindings,
    })
    const uploadMedia = createUploadMediaUseCase({
      mediaObjects: infrastructure.mediaObjects,
      generateId: () => 'media-mf-1',
    })

    const result = await uploadMedia.execute({
      kind: 'listing-image',
      contentType: 'image/jpeg',
      sizeBytes: JPEG_BYTES.byteLength,
      bytes: JPEG_BYTES,
    })

    expect(result).toEqual({
      ok: true,
      data: {
        objectKey: 'listing-images/media-mf-1.jpg',
        url: '/media/listing-images/media-mf-1.jpg',
      },
    })

    const stored = await infrastructure.mediaObjects.get('listing-images/media-mf-1.jpg')
    expect(stored).not.toBeNull()
    expect(stored?.httpMetadata?.contentType).toBe('image/jpeg')
    expect(new Uint8Array((await stored?.arrayBuffer()) ?? new ArrayBuffer(0))).toEqual(JPEG_BYTES)

    if (result.ok) {
      expect(isAdmissibleMediaObjectKey('listing-image', result.data.objectKey)).toBe(true)
      expect(isAdmissibleMediaObjectKey('report-photo', result.data.objectKey)).toBe(false)
    }
  })

  it('rejects invalid uploads before anything reaches the R2 binding', async () => {
    miniflare = new Miniflare({
      modules: true,
      script: `export default { fetch() { return new Response("ok") } }`,
      d1Databases: { DB: 'pet-buddies-upload-reject-test-db' },
      r2Buckets: ['MEDIA_BUCKET'],
    })

    const infrastructure = createCloudflareInfrastructure({
      env: (await miniflare.getBindings()) as PetBuddiesCloudflareBindings,
    })
    const uploadMedia = createUploadMediaUseCase({
      mediaObjects: infrastructure.mediaObjects,
      generateId: () => 'media-mf-2',
    })

    const spoofed = await uploadMedia.execute({
      kind: 'report-photo',
      contentType: 'image/png',
      sizeBytes: JPEG_BYTES.byteLength,
      bytes: JPEG_BYTES,
    })
    expect(spoofed.ok).toBe(false)

    const oversized = await uploadMedia.execute({
      kind: 'report-photo',
      contentType: 'image/jpeg',
      sizeBytes: 5 * 1024 * 1024 + 1,
      bytes: JPEG_BYTES,
    })
    expect(oversized.ok).toBe(false)

    expect(await infrastructure.mediaObjects.head('report-photos/media-mf-2.png')).toBeNull()
    expect(await infrastructure.mediaObjects.head('report-photos/media-mf-2.jpg')).toBeNull()
  })

  it('stores media objects through R2 and derives public URLs only when configured', async () => {
    const bucket = {
      put: vi.fn<Pick<R2Bucket, 'put'>['put']>().mockResolvedValue({} as R2Object),
      head: vi.fn<Pick<R2Bucket, 'head'>['head']>().mockResolvedValue(null),
      get: vi.fn<Pick<R2Bucket, 'get'>['get']>().mockResolvedValue(null),
    }
    const store = createR2MediaObjectStore({
      bucket,
      publicBaseUrl: 'https://media.example.com/pet-buddies',
    })

    await expect(
      store.put({
        objectKey: 'listing images/mango 1.jpg',
        body: 'image-bytes',
        contentType: 'image/jpeg',
      }),
    ).resolves.toEqual({
      objectKey: 'listing images/mango 1.jpg',
      publicUrl: 'https://media.example.com/pet-buddies/listing%20images/mango%201.jpg',
    })
    expect(bucket.put).toHaveBeenCalledWith('listing images/mango 1.jpg', 'image-bytes', {
      httpMetadata: { contentType: 'image/jpeg' },
    })
    expect(createR2MediaObjectStore({ bucket }).toPublicUrl('private/image.jpg')).toBeNull()
  })
})
