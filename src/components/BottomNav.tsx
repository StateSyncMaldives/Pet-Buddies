import { Link, useRouterState } from '@tanstack/react-router'
import { colors } from '../theme'
import { ROUTE_PATHS, getTabFromPathname } from '../router/paths'
import { NAV_DESTINATIONS, TabIcon } from './nav-model'

export function BottomNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const activeTab = getTabFromPathname(pathname)

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
      {NAV_DESTINATIONS.map(({ tab, label }) => {
        const active = activeTab === tab
        const color = active ? colors.navActive : colors.navInactive
        return (
          <Link
            key={tab}
            to={ROUTE_PATHS[tab]}
            preload="intent"
            aria-current={active ? 'page' : undefined}
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
              textDecoration: 'none',
            }}
          >
            <TabIcon tab={tab} color={color} />
            <span style={{ fontSize: 10.5, fontWeight: 600, color }}>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
