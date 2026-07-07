// Trait-filter pill for the Browse screen. Presentational — the parent owns the toggle.
import type * as React from 'react'
import { colors } from '../theme'

export function FilterChip({
  label,
  active,
  onToggle,
}: {
  label: string
  active: boolean
  onToggle: () => void
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      style={{
        flex: 'none',
        border: `1.5px solid ${active ? colors.deepBlue : '#d8dce4'}`,
        background: active ? colors.deepBlue : '#fff',
        color: active ? '#fff' : '#6b7280',
        padding: '7px 14px',
        borderRadius: 999,
        fontSize: 12.5,
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition:
          'background-color .15s var(--pb-ease-out), border-color .15s var(--pb-ease-out), color .15s var(--pb-ease-out)',
      }}
    >
      {label}
    </button>
  )
}
