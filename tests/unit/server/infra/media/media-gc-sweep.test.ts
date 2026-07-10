import { describe, expect, it } from 'vitest'

import { sweepOrphanedMedia, type MediaGcBucket } from '../../../../../src/server/infra/media/media-gc-sweep'

const NOW = '2026-07-10T12:00:00.000Z'
const OLD = new Date('2026-07-01T12:00:00.000Z')
const RECENT = new Date('2026-07-10T11:59:00.000Z')

function createFakeBucket(objects: Array<{ key: string; uploaded: Date }>): MediaGcBucket & { keys: () => string[] } {
  let store = [...objects]
  return {
    keys: () => store.map((object) => object.key),
    async list(options) {
      const prefix = options?.prefix ?? ''
      return { objects: store.filter((object) => object.key.startsWith(prefix)), truncated: false }
    },
    async delete(keys) {
      const toDelete = new Set(Array.isArray(keys) ? keys : [keys])
      store = store.filter((object) => !toDelete.has(object.key))
    },
  }
}

describe('sweepOrphanedMedia', () => {
  it('deletes unreferenced managed blobs older than the grace window and keeps the rest', async () => {
    const bucket = createFakeBucket([
      { key: 'listing-images/referenced.jpg', uploaded: OLD },
      { key: 'listing-images/orphan.jpg', uploaded: OLD },
      { key: 'report-photos/orphan.png', uploaded: OLD },
      { key: 'listing-images/fresh.jpg', uploaded: RECENT },
    ])

    const result = await sweepOrphanedMedia({
      bucket,
      referencedKeys: async () => new Set(['listing-images/referenced.jpg']),
      now: () => NOW,
    })

    expect(result.deleted.sort()).toEqual(['listing-images/orphan.jpg', 'report-photos/orphan.png'])
    expect(bucket.keys().sort()).toEqual(['listing-images/fresh.jpg', 'listing-images/referenced.jpg'])
  })

  it('is idempotent — a second sweep deletes nothing', async () => {
    const bucket = createFakeBucket([{ key: 'listing-images/orphan.jpg', uploaded: OLD }])
    const referencedKeys = async () => new Set<string>()

    const first = await sweepOrphanedMedia({ bucket, referencedKeys, now: () => NOW })
    const second = await sweepOrphanedMedia({ bucket, referencedKeys, now: () => NOW })

    expect(first.deleted).toEqual(['listing-images/orphan.jpg'])
    expect(second.deleted).toEqual([])
    expect(bucket.keys()).toEqual([])
  })
})
