import type { Tab } from '../types'

export const ROUTE_PATHS: Record<Tab, string> = {
  browse: '/browse',
  report: '/report',
  vets: '/vets',
  inbox: '/you',
  saved: '/saved',
}

export const DETAIL_ROUTE_PATH = 'browse/listings/$listingId'
const DETAIL_PATH_PREFIX = `${ROUTE_PATHS.browse}/listings/`

export function getDetailPath(listingId: string): string {
  return `${DETAIL_PATH_PREFIX}${listingId}`
}

export function getListingIdFromDetailPath(pathname: string): string | null {
  if (!isDetailPath(pathname)) return null

  const listingId = pathname.slice(DETAIL_PATH_PREFIX.length)
  return listingId || null
}

export function isDetailPath(pathname: string): boolean {
  return pathname.startsWith(DETAIL_PATH_PREFIX)
}

export function getTabFromPathname(pathname: string): Tab {
  if (pathname === ROUTE_PATHS.browse || isDetailPath(pathname)) return 'browse'
  if (pathname === ROUTE_PATHS.report) return 'report'
  if (pathname === ROUTE_PATHS.vets) return 'vets'
  if (pathname === ROUTE_PATHS.inbox) return 'inbox'
  if (pathname === ROUTE_PATHS.saved) return 'saved'
  return 'browse'
}
