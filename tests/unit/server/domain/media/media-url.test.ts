import { describe, expect, it } from 'vitest'

import { resolveMediaUrl } from '../../../../../src/server/domain/media/media-url'

describe('media url resolution', () => {
  it('derives a serving-route url for a managed key when no public base url is configured', () => {
    expect(resolveMediaUrl({ objectKey: 'listing-images/media-1.jpg', publicUrl: null })).toBe(
      '/media/listing-images/media-1.jpg',
    )
  })

  it('derives from the public base url for a managed key when configured', () => {
    expect(
      resolveMediaUrl(
        { objectKey: 'report-photos/media-2.png', publicUrl: null },
        { publicBaseUrl: 'https://media.example.com/pet-buddies' },
      ),
    ).toBe('https://media.example.com/pet-buddies/report-photos/media-2.png')
  })

  it('ignores a stale stored public url for managed keys and derives fresh', () => {
    expect(
      resolveMediaUrl({ objectKey: 'listing-images/media-3.webp', publicUrl: 'https://old-domain.example.com/x.webp' }),
    ).toBe('/media/listing-images/media-3.webp')
  })

  it('passes through the stored public url for unmanaged keys such as seed data', () => {
    expect(resolveMediaUrl({ objectKey: 'seed/mango', publicUrl: 'https://images.example.com/mango.jpg' })).toBe(
      'https://images.example.com/mango.jpg',
    )
  })

  it('returns null for an unmanaged key without a stored public url', () => {
    expect(resolveMediaUrl({ objectKey: 'seed/mango', publicUrl: null })).toBe(null)
  })
})
