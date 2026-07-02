import { describe, expect, it } from 'vitest'

import {
  DETAIL_ROUTE_PATH,
  ROUTE_PATHS,
  getDetailPath,
  getListingIdFromDetailPath,
  getTabFromPathname,
  isDetailPath,
} from '../../src/router/paths'

describe('router path helpers', () => {
  it('builds the canonical detail route path shape', () => {
    expect(DETAIL_ROUTE_PATH).toBe('browse/listings/$listingId')
  })

  it('builds detail URLs from listing ids', () => {
    expect(getDetailPath('luna')).toBe('/browse/listings/luna')
  })

  it('extracts the listing id only from valid detail paths', () => {
    expect(getListingIdFromDetailPath('/browse/listings/luna')).toBe('luna')
    expect(getListingIdFromDetailPath('/browse/listings/')).toBeNull()
    expect(getListingIdFromDetailPath('/report')).toBeNull()
  })

  it('classifies browse detail paths under the browse tab', () => {
    expect(isDetailPath('/browse/listings/luna')).toBe(true)
    expect(getTabFromPathname('/browse/listings/luna')).toBe('browse')
    expect(getTabFromPathname(ROUTE_PATHS.saved)).toBe('saved')
  })
})
