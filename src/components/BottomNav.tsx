import { colors } from '../theme'
import { useStore } from '../store/store'
import type { Tab } from '../types'
import { CrossIcon, GridIcon, HeartIcon, PersonIcon, PinIcon } from './icons'

const TABS: { tab: Tab; label: string }[] = [
  { tab: 'browse', label: 'Browse' },
  { tab: 'report', label: 'Report' },
  { tab: 'vets', label: 'Vets' },
  { tab: 'inbox', label: 'You' },
  { tab: 'saved', label: 'Saved' },
]

function TabIcon({ tab, color }: { tab: Tab; color: string }) {
  switch (tab) {
    case 'browse':
      return <GridIcon stroke={color} />
    case 'report':
      return <PinIcon size={23} stroke={color} />
    case 'vets':
      return <CrossIcon stroke={color} />
    case 'inbox':
      return <PersonIcon size={23} stroke={color} strokeWidth={2} />
    case 'saved':
      return <HeartIcon size={23} stroke={color} strokeWidth={2} />
  }
}

export function BottomNav() {
  const { state, setTab } = useStore()
  return (
    <nav
      className="pb-nav"
      style={{
        background: 'rgba(247,248,250,.9)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: `1px solid ${colors.lineNav}`,
        borderRadius: 999,
        boxShadow: '0 10px 28px rgba(36,48,47,.16)',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        padding: '8px 10px',
      }}
    >
      {TABS.map(({ tab, label }) => {
        const active = state.tab === tab
        const color = active ? colors.navActive : colors.navInactive
        return (
          <button
            key={tab}
            onClick={() => setTab(tab)}
            aria-current={active}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              padding: '5px 13px',
              borderRadius: 16,
              cursor: 'pointer',
            }}
          >
            <TabIcon tab={tab} color={color} />
            <span style={{ fontSize: 10.5, fontWeight: 600, color }}>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
