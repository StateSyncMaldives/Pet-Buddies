import { drizzle } from 'drizzle-orm/d1'
import { Miniflare } from 'miniflare'
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest'

import {
  createCloudflareInfrastructure,
  type PetBuddiesCloudflareBindings,
} from '../../../../src/server/infra/cloudflare/bindings'
import { createDrizzleDatabaseFromD1 } from '../../../../src/server/infra/db/d1-drizzle'
import { createR2MediaObjectStore } from '../../../../src/server/infra/media/r2-media-store'
import * as schema from '../../../../src/server/infra/db/schema'

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
