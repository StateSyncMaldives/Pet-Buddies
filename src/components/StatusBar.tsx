import { colors } from '../theme'

/** Cosmetic iOS-style status bar (notch, time, signal, battery). */
export function StatusBar() {
  return (
    <div
      className="pb-statusbar"
      style={{
        height: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 30px',
        position: 'relative',
        zIndex: 5,
        flex: 'none',
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 700, color: colors.ink, letterSpacing: '0.02em' }}>
        9:41
      </span>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 9,
          transform: 'translateX(-50%)',
          width: 108,
          height: 30,
          background: '#1a1d1c',
          borderRadius: 18,
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="17" height="11" viewBox="0 0 17 11" fill={colors.ink} aria-hidden>
          <rect x="0" y="7" width="3" height="4" rx="1" />
          <rect x="4.5" y="5" width="3" height="6" rx="1" />
          <rect x="9" y="2.5" width="3" height="8.5" rx="1" />
          <rect x="13.5" y="0" width="3" height="11" rx="1" />
        </svg>
        <svg width="22" height="11" viewBox="0 0 24 12" fill="none" aria-hidden>
          <rect x="1" y="1" width="20" height="10" rx="3" stroke={colors.ink} strokeOpacity="0.5" />
          <rect x="2.5" y="2.5" width="15" height="7" rx="1.5" fill={colors.ink} />
          <rect x="22" y="4" width="1.6" height="4" rx="0.8" fill={colors.ink} fillOpacity="0.5" />
        </svg>
      </div>
    </div>
  )
}
