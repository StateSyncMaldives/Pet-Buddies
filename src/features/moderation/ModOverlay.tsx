import { colors, shadow, z } from '../../theme'
import { useStore } from '../../store/store'
import { useViewportMode } from '../../layout/viewport-mode'
import { PetThumb, CheckMedallion, InfoCircle } from '../../components/primitives'
import { OverlaySurface } from '../../components/OverlaySurface'
import { ChevronLeftIcon } from '../../components/icons'

export function ModOverlay() {
  const { state, listings, closeMod, approveListing, rejectListing } = useStore()
  const desktop = useViewportMode() === 'desktop'
  if (state.overlay !== 'mod') return null

  const pending = listings.filter((l) => l.status === 'pending')

  return (
    <OverlaySurface label="Review queue" zIndex={z.mod} onDismiss={closeMod} width={880} background="#F1EFEA">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px', background: colors.appBg, borderBottom: '1px solid #e6e9ef', flex: 'none' }}>
        <button
          onClick={closeMod}
          style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 5, fontSize: 14, fontWeight: 600, color: colors.textSecondary, cursor: 'pointer' }}
        >
          <ChevronLeftIcon size={17} stroke={colors.textSecondary} />
          Done
        </button>
        <span style={{ fontSize: 15, fontWeight: 700, color: colors.ink }}>Review queue</span>
        <span style={{ minWidth: 48, textAlign: 'right', fontSize: 13, fontWeight: 700, color: colors.wordmarkPink }}>
          {pending.length}
        </span>
      </div>

      <div className="pbscroll" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px calc(40px + env(safe-area-inset-bottom, 0px))' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: colors.liveBg, borderRadius: 12, padding: '12px 14px', marginBottom: 18 }}>
          <InfoCircle stroke={colors.deepBlue} size={16} />
          <span style={{ fontSize: 12, color: colors.deepBlue, lineHeight: 1.5 }}>
            Individual listings need a quick check before going live. Verified-org listings publish
            automatically.
          </span>
        </div>

        {pending.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '80px 0' }}>
            <CheckMedallion bg="#E8F3FB" stroke={colors.actionBlue} size={74} />
            <p style={{ fontSize: 14, color: colors.faint, lineHeight: 1.55, maxWidth: 230, margin: 0 }}>
              All caught up — no listings waiting for review.
            </p>
          </div>
        ) : (
          <div
            style={
              desktop
                ? { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14, alignItems: 'start' }
                : undefined
            }
          >
          {pending.map((p) => (
            <div key={p.id} style={{ background: '#fff', borderRadius: 18, boxShadow: shadow.card, overflow: 'hidden', marginBottom: desktop ? 0 : 14 }}>
              <div style={{ display: 'flex', gap: 13, padding: '15px 15px 13px' }}>
                <PetThumb species={p.species} photo={p.photo} name={p.name} size={60} radius={13} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 17, fontWeight: 700, color: colors.ink }}>{p.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: colors.pendingText, background: colors.pendingBg, padding: '3px 9px', borderRadius: 7, whiteSpace: 'nowrap' }}>
                      Pending
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5, color: colors.textSecondary, margin: '3px 0 2px' }}>
                    {(p.species === 'cat' ? 'Cat' : p.breed ?? 'Bird') + ' · ' + p.area}
                  </div>
                  <div style={{ fontSize: 12, color: colors.textSecondaryAlt }}>
                    Listed by {p.lister ?? 'Individual'}
                  </div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: '#6d6a61', lineHeight: 1.5, margin: 0, padding: '0 15px 13px' }}>
                {p.story || 'No description provided.'}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 15px 14px' }}>
                {p.tags.map((t) => (
                  <span key={t} style={{ background: colors.paper, color: '#6b7280', fontSize: 11.5, fontWeight: 600, padding: '4px 9px', borderRadius: 7 }}>
                    {t}
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 9, padding: '0 15px 15px' }}>
                <button
                  onClick={() => rejectListing(p.id)}
                  aria-label={`Reject ${p.name}`}
                  style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1.5px solid #ecc9d3', background: '#fff', color: colors.rejectText, fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}
                >
                  Reject
                </button>
                <button
                  onClick={() => approveListing(p.id)}
                  aria-label={`Approve and publish ${p.name}`}
                  style={{ flex: 1.4, padding: '12px 0', borderRadius: 12, border: 'none', background: colors.approveGreen, color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="4,12 10,18 20,5" />
                  </svg>
                  Approve &amp; publish
                </button>
              </div>
            </div>
          ))}
          </div>
        )}
      </div>
    </OverlaySurface>
  )
}
