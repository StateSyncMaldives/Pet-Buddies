import { colors, z } from '../theme'
import { useStore } from '../store/store'

/** Transient pill, bottom-centre, ~2.2s (handled by the store timer). */
export function Toast() {
  const { state } = useStore()
  if (!state.toast) return null
  return (
    <div
      role="status"
      className="pb-toast"
      style={{
        bottom: 'calc(96px + env(safe-area-inset-bottom, 0px))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: z.toast,
        background: colors.ink,
        color: '#fff',
        fontSize: 13,
        fontWeight: 600,
        padding: '11px 20px',
        borderRadius: 999,
        boxShadow: '0 8px 24px rgba(0,0,0,.25)',
        whiteSpace: 'nowrap',
        animation: 'pb-toast-in .18s ease',
      }}
    >
      {state.toast}
    </div>
  )
}
