import { useEffect, useRef } from 'react'
import type { CSSProperties, KeyboardEvent, MouseEvent, ReactNode } from 'react'
import { useViewportMode } from '../layout/viewport-mode'
import { colors } from '../theme'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Store-driven overlay presenter (ADR 0004): phone/column render the existing
 * full-screen sheet; desktop (>900px) promotes the same content to a centered,
 * focus-trapped modal dialog with a scrim. Open/close state stays in the store;
 * this component only owns presentation.
 */
export function OverlaySurface({
  label,
  zIndex,
  onDismiss,
  width = 560,
  dismissOnScrim = true,
  background = colors.appBg,
  children,
}: {
  /** Accessible dialog name, e.g. "Sign in" or "Adoption inquiry". */
  label: string
  zIndex: number
  /** Invoked on Esc or scrim click; wire to the surface's cancel action. */
  onDismiss: () => void
  /** Desktop dialog width ceiling in px. */
  width?: number
  /** Set false when a stray scrim click would destroy user input (drafts). */
  dismissOnScrim?: boolean
  background?: string
  children: ReactNode
}) {
  const desktop = useViewportMode() === 'desktop'
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!desktop) return
    const dialog = dialogRef.current
    if (!dialog) return
    const previous = document.activeElement as HTMLElement | null
    dialog.focus()
    return () => previous?.focus?.()
  }, [desktop])

  if (!desktop) {
    return (
      <div
        className="pb-overlay"
        style={{
          background,
          zIndex,
          display: 'flex',
          flexDirection: 'column',
          animation: 'pb-overlay-in .22s cubic-bezier(.4,0,.2,1)',
        }}
      >
        {children}
      </div>
    )
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onDismiss()
      return
    }
    if (event.key !== 'Tab') return
    const dialog = dialogRef.current
    if (!dialog) return
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE))
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const active = document.activeElement
    if (event.shiftKey && (active === first || active === dialog)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const onScrimMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (dismissOnScrim && event.target === event.currentTarget) onDismiss()
  }

  return (
    <div className="pb-scrim" style={{ zIndex }} onMouseDown={onScrimMouseDown}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className="pb-dialog"
        style={{ width: `min(92vw, ${width}px)`, background } as CSSProperties}
        onKeyDown={onKeyDown}
      >
        {children}
      </div>
    </div>
  )
}
