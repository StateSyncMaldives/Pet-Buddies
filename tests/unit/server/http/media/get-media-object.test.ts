import { describe, expect, it, vi } from 'vitest'

import { serveMediaObject } from '../../../../../src/server/http/media/get-media-object'
import { JPEG_BYTES } from '../../../../helpers/media-fixtures'

describe('serve media object', () => {
  it('streams a stored managed object with its content type and immutable caching', async () => {
    const response = await serveMediaObject({
      objectKey: 'listing-images/media-1.jpg',
      getObject: async () => ({ bytes: JPEG_BYTES, contentType: 'image/jpeg' }),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/jpeg')
    expect(response.headers.get('cache-control')).toBe('public, max-age=31536000, immutable')
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(JPEG_BYTES)
  })

  it('returns 404 for a managed key with no stored object', async () => {
    const response = await serveMediaObject({
      objectKey: 'report-photos/media-9.png',
      getObject: async () => null,
    })

    expect(response.status).toBe(404)
  })

  it('returns 404 for an unmanaged key without reading storage', async () => {
    const getObject = vi.fn()

    const response = await serveMediaObject({
      objectKey: 'seed/mango',
      getObject,
    })

    expect(response.status).toBe(404)
    expect(getObject).not.toHaveBeenCalled()
  })
})
