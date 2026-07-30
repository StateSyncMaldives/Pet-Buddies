import type { InboxView } from '../types'

export interface YouSearch {
  view: InboxView
}

export function validateYouSearch(search: Record<string, unknown>): YouSearch {
  if (search.view === 'listings') return { view: 'listings' }
  if (search.view === 'received') return { view: 'received' }
  // `inquiries` is the legacy name for what is now `sent`; keep old links and
  // bookmarks working rather than silently dropping them on the floor.
  return { view: 'sent' }
}
