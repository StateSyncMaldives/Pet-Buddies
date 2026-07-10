import { describe, expect, it } from 'vitest'

import { selectOrphanedMediaKeys } from '../../../../../src/server/domain/media/media-gc'

const NOW = '2026-07-10T12:00:00.000Z'
const OLD = '2026-07-01T12:00:00.000Z' // 9 days before NOW
const RECENT = '2026-07-10T11:59:00.000Z' // 1 minute before NOW
const GRACE_MS = 24 * 60 * 60 * 1000 // 1 day

describe('selectOrphanedMediaKeys', () => {
  it('selects unreferenced managed keys uploaded before the grace window', () => {
    const orphans = selectOrphanedMediaKeys({
      stored: [
        { objectKey: 'listing-images/orphan-1.jpg', uploadedAt: OLD },
        { objectKey: 'report-photos/orphan-2.png', uploadedAt: OLD },
      ],
      referencedKeys: [],
      now: NOW,
      graceMs: GRACE_MS,
    })

    expect(orphans.sort()).toEqual(['listing-images/orphan-1.jpg', 'report-photos/orphan-2.png'])
  })

  it('spares keys still referenced by a durable row', () => {
    const orphans = selectOrphanedMediaKeys({
      stored: [
        { objectKey: 'listing-images/kept.jpg', uploadedAt: OLD },
        { objectKey: 'listing-images/orphan.jpg', uploadedAt: OLD },
      ],
      referencedKeys: ['listing-images/kept.jpg'],
      now: NOW,
      graceMs: GRACE_MS,
    })

    expect(orphans).toEqual(['listing-images/orphan.jpg'])
  })

  it('spares recent uploads inside the grace window', () => {
    const orphans = selectOrphanedMediaKeys({
      stored: [{ objectKey: 'listing-images/fresh.jpg', uploadedAt: RECENT }],
      referencedKeys: [],
      now: NOW,
      graceMs: GRACE_MS,
    })

    expect(orphans).toEqual([])
  })

  it('never selects non-managed keys', () => {
    const orphans = selectOrphanedMediaKeys({
      stored: [{ objectKey: 'random/not-managed.jpg', uploadedAt: OLD }],
      referencedKeys: [],
      now: NOW,
      graceMs: GRACE_MS,
    })

    expect(orphans).toEqual([])
  })
})
