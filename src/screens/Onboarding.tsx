import { colors, font, shadow, z } from '../theme'
import { useStore } from '../store/store'
import { LogoMark, Silhouette } from '../components/Brand'

export function Onboarding() {
  const { state, obNext, obSkip } = useStore()
  if (state.onboarded) return null
  const step = state.obStep

  return (
    <div className="pb-overlay" style={{ background: colors.appBg, zIndex: z.onboarding, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 22px 0' }}>
        <button onClick={obSkip} style={{ background: 'none', border: 'none', fontSize: 13.5, fontWeight: 600, color: colors.faint, cursor: 'pointer' }}>
          Skip
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 38px' }}>
        {step === 0 && (
          <>
            <div style={{ marginBottom: 26 }}>
              <LogoMark width={112} height={90} />
            </div>
            <div style={{ fontFamily: font.brand, fontWeight: 600, fontSize: 30, lineHeight: 1, marginBottom: 18 }}>
              <span style={{ color: colors.actionBlue }}>Pet</span>
              <span style={{ color: colors.wordmarkPink }}>Buddies</span>
            </div>
            <p style={{ fontSize: 15.5, color: '#6d6a61', lineHeight: 1.6, maxWidth: 290, margin: 0 }}>
              Adopt cats &amp; birds, report strays, and find a vet — all in one place, made for
              Greater Malé.
            </p>
          </>
        )}

        {step === 1 && (
          <>
            <div style={{ display: 'flex', gap: 16, marginBottom: 34 }}>
              <div style={{ width: 108, height: 108, borderRadius: 26, background: colors.blush, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Silhouette species="cat" width={64} height={54} opacity={1} />
              </div>
              <div style={{ width: 108, height: 108, borderRadius: 26, background: colors.powderBlue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Silhouette species="bird" width={60} height={54} opacity={1} />
              </div>
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: colors.ink, letterSpacing: '-0.02em', margin: '0 0 12px' }}>
              Give a pet a home
            </h2>
            <p style={{ fontSize: 15.5, color: '#6d6a61', lineHeight: 1.6, maxWidth: 290, margin: 0 }}>
              Browse cats and birds from trusted rescuers and fosters. Save favourites and apply to
              adopt in a tap.
            </p>
          </>
        )}

        {step === 2 && (
          <>
            <div style={{ marginBottom: 34 }}>
              <div style={{ width: 104, height: 104, borderRadius: '50%', background: colors.liveBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ width: 62, height: 62, borderRadius: '50%', background: colors.actionBlue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="5,13 10,18 19,7" />
                  </svg>
                </span>
              </div>
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: colors.ink, letterSpacing: '-0.02em', margin: '0 0 12px' }}>
              Safe &amp; accountable
            </h2>
            <p style={{ fontSize: 15.5, color: '#6d6a61', lineHeight: 1.6, maxWidth: 295, margin: 0 }}>
              Verified orgs carry a blue check and listings are reviewed before they go live. Spot a
              lost or stray animal? Report it in seconds.
            </p>
          </>
        )}
      </div>

      <div style={{ padding: '0 38px 42px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: step === i ? colors.actionBlue : '#DBD5CA' }} />
          ))}
        </div>
        <button
          onClick={obNext}
          style={{ width: '100%', padding: '16px 0', borderRadius: 16, border: 'none', background: colors.deepBlue, color: '#fff', fontSize: 15.5, fontWeight: 700, cursor: 'pointer', boxShadow: shadow.raisedLg }}
        >
          {step >= 2 ? 'Get started' : 'Next'}
        </button>
      </div>
    </div>
  )
}
