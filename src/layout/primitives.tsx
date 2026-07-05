import type { ReactNode } from 'react'
import { colors } from '../theme'
import { useViewportMode } from './viewport-mode'

/**
 * Layout primitives (ADR 0004): screens compose these instead of branching on
 * viewport mode themselves. The phone values are the frozen reference layout;
 * the desktop values are the shell-wide composition. Deleting this module
 * would re-scatter mode ternaries across every standard screen — it earns its
 * depth at that seam. Bespoke surfaces (Browse hero, the two-pane listing
 * detail) intentionally use `useViewportMode` directly instead.
 */

/** Standard page shell: mode-aware padding plus the title/subtitle header
 * every tab screen shares. `maxWidth` (desktop only) centers reading-width
 * content such as forms. */
export function Screen({
  title,
  subtitle,
  maxWidth,
  children,
}: {
  title?: ReactNode
  subtitle?: ReactNode
  /** Desktop-only content width cap (px); centers the column when set. */
  maxWidth?: number
  children: ReactNode
}) {
  const desktop = useViewportMode() === 'desktop'
  return (
    <div
      style={{
        padding: desktop ? '28px 0 90px' : '14px 20px 110px',
        maxWidth: desktop ? maxWidth : undefined,
        marginInline: desktop && maxWidth ? 'auto' : undefined,
      }}
    >
      {title != null && (
        <h1
          style={{
            // 32px on desktop so tab pages don't read as enlarged phone screens.
            fontSize: desktop ? 32 : 25,
            fontWeight: 700,
            color: colors.ink,
            letterSpacing: '-0.02em',
            margin: subtitle != null ? '6px 0 4px' : '6px 0 16px',
          }}
        >
          {title}
        </h1>
      )}
      {subtitle != null && (
        <p style={{ fontSize: 13.5, color: colors.textSecondary, margin: '0 0 22px' }}>{subtitle}</p>
      )}
      {children}
    </div>
  )
}

/** Card collection: the frozen phone presentation is a vertical stack (gap
 * replaces the old per-card margin-bottom); desktop lays the same cards in an
 * auto-fill grid. Children must not carry their own stacking margins. */
export function CardGrid({
  minCardWidth = 380,
  gap = 14,
  phoneGap = 12,
  children,
}: {
  minCardWidth?: number
  gap?: number
  phoneGap?: number
  children: ReactNode
}) {
  const desktop = useViewportMode() === 'desktop'
  return (
    <div
      style={
        desktop
          ? {
              display: 'grid',
              gridTemplateColumns: `repeat(auto-fill, minmax(${minCardWidth}px, 1fr))`,
              gap,
              alignItems: 'start',
            }
          : { display: 'flex', flexDirection: 'column', gap: phoneGap }
      }
    >
      {children}
    </div>
  )
}
