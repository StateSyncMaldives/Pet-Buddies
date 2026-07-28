import { Link, useRouteContext, useRouterState } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { colors } from '../theme'
import { useStore } from '../store/store'
import { reviewQueueQuery } from '../query/queries'
import { ROUTE_PATHS, getTabFromPathname } from '../router/paths'
import { LogoMark, Wordmark } from './Brand'
import { NAV_DESTINATIONS, TabIcon } from './nav-model'
import { PlusIcon, ShieldIcon } from './icons'

/** Desktop (>900px) app-shell rail: the five primary destinations plus the
 * Create listing action and the moderator Review queue entry. */
export function RailNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const activeTab = getTabFromPathname(pathname)
  const { backend } = useRouteContext({ from: '__root__' })
  const { openAdd, openMod } = useStore()

  // The review badge reads durable truth from the query cache (ADR 0009), not a
  // store mirror — keeps the count in step with the moderation queue.
  const { data: reviewData } = useQuery(reviewQueueQuery(backend))
  const pendingCount = reviewData?.items.length ?? 0

  return (
    <nav className="pb-rail" aria-label="Primary">
      <Link
        to={ROUTE_PATHS.browse}
        aria-label="Pet Buddies home"
        style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', padding: '4px 10px 18px' }}
      >
        <LogoMark width={38} height={31} />
        <Wordmark size={19} />
      </Link>

      <button className="pb-rail-cta" onClick={openAdd}>
        <PlusIcon size={16} stroke="#fff" strokeWidth={2.4} />
        Create listing
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 14 }}>
        {NAV_DESTINATIONS.map(({ tab, label }) => {
          const active = activeTab === tab
          const color = active ? colors.navActive : colors.textSecondary
          return (
            <Link
              key={tab}
              to={ROUTE_PATHS[tab]}
              preload="intent"
              aria-current={active ? 'page' : undefined}
              className="pb-rail-link"
              data-active={active || undefined}
            >
              <TabIcon tab={tab} color={color} size={20} />
              <span style={{ color: active ? colors.navActive : colors.ink }}>{label}</span>
            </Link>
          )
        })}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 18, borderTop: `1px solid ${colors.line}` }}>
        <button className="pb-rail-link pb-rail-queue" onClick={openMod} aria-label="Review queue">
          <span style={{ position: 'relative', display: 'inline-flex' }}>
            <ShieldIcon size={20} stroke={colors.textSecondary} />
            {pendingCount > 0 && (
              <span className="pb-rail-badge" aria-hidden>
                {pendingCount}
              </span>
            )}
          </span>
          <span style={{ color: colors.ink }}>Review queue</span>
        </button>
      </div>
    </nav>
  )
}
