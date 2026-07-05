import { useSyncExternalStore } from 'react'

/**
 * Layout mode derived from viewport width (ADR 0004):
 * - `phone`   ≤440px — the untouched mobile reference experience
 * - `column`  441–900px — centered single column, no bezel
 * - `desktop` >900px — rail-nav app shell
 */
export type ViewportMode = 'phone' | 'column' | 'desktop'

export const PHONE_MAX_WIDTH = 440
export const COLUMN_MAX_WIDTH = 900

export function getViewportMode(width: number): ViewportMode {
  if (width <= PHONE_MAX_WIDTH) return 'phone'
  if (width <= COLUMN_MAX_WIDTH) return 'column'
  return 'desktop'
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('resize', onChange)
  return () => window.removeEventListener('resize', onChange)
}

function getSnapshot(): ViewportMode {
  return getViewportMode(window.innerWidth)
}

// SSR renders the mobile-first reference layout; the client corrects on hydration.
function getServerSnapshot(): ViewportMode {
  return 'phone'
}

export function useViewportMode(): ViewportMode {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
