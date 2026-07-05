import type { Tab } from '../types'
import { CrossIcon, GridIcon, HeartIcon, PersonIcon, PinIcon } from './icons'

/** The app's primary destinations, in display order — the single source both
 * the bottom pill nav (phone/column) and the desktop rail derive from. */
export const NAV_DESTINATIONS: { tab: Tab; label: string }[] = [
  { tab: 'browse', label: 'Browse' },
  { tab: 'report', label: 'Report' },
  { tab: 'vets', label: 'Vets' },
  { tab: 'inbox', label: 'You' },
  { tab: 'saved', label: 'Saved' },
]

export function TabIcon({ tab, color, size }: { tab: Tab; color: string; size?: number }) {
  switch (tab) {
    case 'browse':
      return <GridIcon stroke={color} size={size} />
    case 'report':
      return <PinIcon size={size ?? 23} stroke={color} />
    case 'vets':
      return <CrossIcon stroke={color} size={size} />
    case 'inbox':
      return <PersonIcon size={size ?? 23} stroke={color} strokeWidth={2} />
    case 'saved':
      return <HeartIcon size={size ?? 23} stroke={color} strokeWidth={2} />
  }
}
