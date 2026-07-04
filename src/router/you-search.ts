import type { InboxView } from '../types'

export interface YouSearch {
  view: InboxView
}

export function validateYouSearch(search: Record<string, unknown>): YouSearch {
  return {
    view: search.view === 'listings' ? 'listings' : 'inquiries',
  }
}
