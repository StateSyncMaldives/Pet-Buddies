import { describe, expect, it } from 'vitest'

import {
  buildMediaObjectKey,
  isAdmissibleMediaObjectKey,
} from '../../../../../src/server/domain/media/media-object-keys'

describe('media object keys', () => {
  it('builds a listing image key under the listing-images prefix', () => {
    expect(buildMediaObjectKey({ kind: 'listing-image', id: 'media-abc-123', extension: 'jpg' })).toBe(
      'listing-images/media-abc-123.jpg',
    )
  })

  it('builds a report photo key under the report-photos prefix', () => {
    expect(buildMediaObjectKey({ kind: 'report-photo', id: 'media-def-456', extension: 'webp' })).toBe(
      'report-photos/media-def-456.webp',
    )
  })

  it('admits a key it built for the same kind', () => {
    const key = buildMediaObjectKey({ kind: 'listing-image', id: 'media-abc-123', extension: 'png' })

    expect(isAdmissibleMediaObjectKey('listing-image', key)).toBe(true)
  })

  it('rejects a key from the other kind', () => {
    const reportKey = buildMediaObjectKey({ kind: 'report-photo', id: 'media-abc-123', extension: 'jpg' })

    expect(isAdmissibleMediaObjectKey('listing-image', reportKey)).toBe(false)
    expect(isAdmissibleMediaObjectKey('report-photo', 'listing-images/media-abc-123.jpg')).toBe(false)
  })

  it('rejects malformed keys', () => {
    expect(isAdmissibleMediaObjectKey('listing-image', 'seed/mango')).toBe(false)
    expect(isAdmissibleMediaObjectKey('listing-image', 'listing-images/../secrets.jpg')).toBe(false)
    expect(isAdmissibleMediaObjectKey('listing-image', 'listing-images/a/b.jpg')).toBe(false)
    expect(isAdmissibleMediaObjectKey('listing-image', 'listing-images/media-abc-123')).toBe(false)
    expect(isAdmissibleMediaObjectKey('listing-image', 'listing-images/media-abc-123.gif')).toBe(false)
    expect(isAdmissibleMediaObjectKey('listing-image', 'listing-images/MEDIA ABC.jpg')).toBe(false)
    expect(isAdmissibleMediaObjectKey('listing-image', '')).toBe(false)
  })
})
