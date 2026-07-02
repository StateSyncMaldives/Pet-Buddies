import { describe, expect, it } from 'vitest'

import { ROUTE_PATHS, getDetailPath, getTabFromPathname, isDetailPath } from '../../../src/router/paths'

describe('router paths', () => {
  it('defines stable top-level tab paths for Pet Buddies', () => {
    expect(ROUTE_PATHS).toEqual({
      browse: '/browse',
      report: '/report',
      vets: '/vets',
      inbox: '/you',
      saved: '/saved',
    })
  })

  it('builds the browse detail route for a listing id', () => {
    expect(getDetailPath('listing-42')).toBe('/browse/listings/listing-42')
    expect(isDetailPath('/browse/listings/listing-42')).toBe(true)
  })

  it('maps pathname shapes back to the active bottom-nav tab', () => {
    expect(getTabFromPathname('/browse')).toBe('browse')
    expect(getTabFromPathname('/browse/listings/listing-42')).toBe('browse')
    expect(getTabFromPathname('/report')).toBe('report')
    expect(getTabFromPathname('/vets')).toBe('vets')
    expect(getTabFromPathname('/you')).toBe('inbox')
    expect(getTabFromPathname('/saved')).toBe('saved')
  })
})
