import { useEffect, useRef } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { getTabFromPathname } from '../../router/paths'
import { colors, font, z } from '../../theme'
import { useStore } from '../../store/store'

/** Browser-fired install prompt event (not in the standard TS lib). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallSheet() {
  const { state, installAdd, installDismiss } = useStore()
  const pathname = useRouterState({ select: (routerState) => routerState.location.pathname })
  const deferred = useRef<BeforeInstallPromptEvent | null>(null)

  // Capture the real install prompt so "Add to Home Screen" can trigger it.
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      deferred.current = e as BeforeInstallPromptEvent
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  const visible =
    state.onboarded &&
    !state.installed &&
    !state.installDismissed &&
    !state.overlay &&
    getTabFromPathname(pathname) === 'browse'
  if (!visible) return null

  const onAdd = async () => {
    const prompt = deferred.current
    if (prompt) {
      await prompt.prompt()
      await prompt.userChoice
      deferred.current = null
    }
    installAdd()
  }

  return (
    <div className="pb-overlay-full" style={{ zIndex: z.install, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={installDismiss} style={{ position: 'absolute', inset: 0, background: 'rgba(36,40,38,.35)' }} />
      <div style={{ position: 'relative', background: colors.appBg, borderRadius: '28px 28px 0 0', padding: '14px 24px calc(28px + env(safe-area-inset-bottom, 0px))', boxShadow: '0 -10px 40px rgba(0,0,0,.18)', animation: 'pb-overlay-in .26s cubic-bezier(.4,0,.2,1)' }}>
        <div style={{ width: 40, height: 5, borderRadius: 3, background: '#d8dce4', margin: '0 auto 22px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 18 }}>
          <div style={{ width: 62, height: 62, borderRadius: 15, background: colors.paper, boxShadow: '0 4px 12px rgba(36,48,47,.12), inset 0 0 0 1px rgba(0,0,0,.04)', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/icon.svg" width={56} height={56} alt="Pet Buddies" />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: colors.ink }}>Install Pet Buddies</div>
            <div style={{ fontFamily: font.mono, fontSize: 12, color: colors.faint, marginTop: 2 }}>petbuddies.mv</div>
          </div>
        </div>
        <p style={{ fontSize: 14, color: '#565b63', lineHeight: 1.55, margin: '0 0 22px' }}>
          Add it to your home screen for one-tap access — works offline, gets new-listing alerts, and
          needs no app store.
        </p>
        <button
          onClick={onAdd}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: '15px 0', borderRadius: 15, border: 'none', background: colors.deepBlue, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 6px 16px rgba(62,137,190,.32)', marginBottom: 8 }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v12" />
            <polyline points="7,10 12,15 17,10" />
            <path d="M5 19h14" />
          </svg>
          Add to Home Screen
        </button>
        <button onClick={installDismiss} style={{ width: '100%', padding: '11px 0', border: 'none', background: 'none', color: colors.faint, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
          Not now
        </button>
      </div>
    </div>
  )
}
