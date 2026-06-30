import { colors, shadow, z } from '../theme'
import { useStore } from '../store/store'
import { LogoMark } from '../components/Brand'
import { OverlayHeader } from '../components/primitives'
import { font } from '../theme'

export function AuthOverlay() {
  const { state, closeAuth, googleSignIn } = useStore()
  if (state.overlay !== 'auth') return null

  return (
    <div className="pb-overlay" style={overlay}>
      <OverlayHeader onCancel={closeAuth} title="Sign in" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 30px 70px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ marginBottom: 20 }}>
            <LogoMark width={54} height={44} />
          </div>
          <h2 style={{ fontSize: 23, fontWeight: 700, color: colors.ink, letterSpacing: '-0.02em', margin: '0 0 10px' }}>
            Sign in to list a pet
          </h2>
          <p style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 1.55, maxWidth: 280, margin: 0 }}>
            A quick sign-in keeps the community accountable and lets adopters reach you about your
            listings.
          </p>
        </div>

        <button
          onClick={googleSignIn}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 11,
            padding: '15px 0',
            borderRadius: 14,
            border: '1.5px solid #d8dce4',
            background: '#fff',
            fontSize: 15,
            fontWeight: 600,
            color: colors.ink,
            cursor: 'pointer',
            boxShadow: shadow.card,
            marginTop: 32,
          }}
        >
          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: '#fff',
              boxShadow: 'inset 0 0 0 1.5px #e6e2db',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: font.brand,
              fontWeight: 700,
              fontSize: 15,
              color: '#4285F4',
            }}
          >
            G
          </span>
          Continue with Google
        </button>
        <p style={{ fontSize: 11.5, color: colors.faintAlt, textAlign: 'center', lineHeight: 1.55, margin: '18px 0 0' }}>
          We only use your name and email to manage your listings and adoption inquiries. Browsing,
          saving, and reporting never need an account.
        </p>
      </div>
    </div>
  )
}

const overlay = {
  background: colors.appBg,
  zIndex: z.auth,
  display: 'flex',
  flexDirection: 'column',
  animation: 'pb-overlay-in .22s cubic-bezier(.4,0,.2,1)',
} as const
