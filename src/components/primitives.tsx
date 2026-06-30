import type { CSSProperties, ReactNode } from 'react'
import { colors } from '../theme'
import { PetPhoto } from './Brand'
import type { Species } from '../types'

/** Rounded thumbnail — real photo when available, else a faint silhouette on a neutral tint. */
export function PetThumb({ species, photo, name = '', size = 56, radius = 12 }: {
  species: Species
  photo?: string
  name?: string
  size?: number
  radius?: number
}) {
  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: radius,
        background: colors.photoTint,
        overflow: 'hidden',
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <PetPhoto
        photo={photo}
        species={species}
        name={name}
        silhouetteWidth={Math.round(size * 0.6)}
        silhouetteHeight={Math.round(size * 0.52)}
      />
    </div>
  )
}

/** Cancel / centered-title / spacer header used by full-screen overlays. */
export function OverlayHeader({ onCancel, title, cancelLabel = 'Cancel' }: {
  onCancel: () => void
  title: string
  cancelLabel?: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px 12px',
        flex: 'none',
      }}
    >
      <button
        onClick={onCancel}
        style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 600, color: colors.textSecondary, cursor: 'pointer' }}
      >
        {cancelLabel}
      </button>
      <span style={{ fontSize: 15, fontWeight: 700, color: colors.ink }}>{title}</span>
      <span style={{ width: 48 }} />
    </div>
  )
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 600, color: colors.ink, marginBottom: 9 }}>{children}</div>
  )
}

export const inputStyle: CSSProperties = {
  width: '100%',
  padding: '13px 15px',
  borderRadius: 13,
  border: `1.5px solid ${colors.line}`,
  background: '#fff',
  fontSize: 14,
  color: colors.ink,
}

/** Small info / safety / warning note card. `tone` picks the colour pair. */
export function InfoNote({ tone = 'neutral', icon, children }: {
  tone?: 'neutral' | 'amber'
  icon?: ReactNode
  children: ReactNode
}) {
  const bg = tone === 'amber' ? colors.pendingBg : colors.paper
  const color = tone === 'amber' ? '#9a7d31' : '#6b7280'
  const stroke = tone === 'amber' ? colors.pendingText : colors.faint
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, background: bg, borderRadius: 11, padding: '11px 13px' }}>
      {icon ?? <InfoCircle stroke={stroke} />}
      <span style={{ fontSize: 11.5, color, lineHeight: 1.45 }}>{children}</span>
    </div>
  )
}

export function InfoCircle({ stroke = colors.faint, size = 15 }: { stroke?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" style={{ flex: 'none', marginTop: 1 }} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="11" x2="12" y2="16" />
      <circle cx="12" cy="8" r="0.6" fill={stroke} />
    </svg>
  )
}

export function WarnCircle({ stroke = colors.pendingText, size = 15 }: { stroke?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" style={{ flex: 'none', marginTop: 1 }} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="8" x2="12" y2="13" />
      <circle cx="12" cy="16.5" r="0.6" fill={stroke} />
    </svg>
  )
}

/** A pair of pill-buttons acting as a selector (lost/found, cat/bird). */
export function ButtonPair({ left, right, value, onLeft, onRight, padY = 13 }: {
  left: string
  right: string
  value: 'left' | 'right'
  onLeft: () => void
  onRight: () => void
  padY?: number
}) {
  const seg = (on: boolean): CSSProperties => ({
    flex: 1,
    padding: `${padY}px 0`,
    borderRadius: 13,
    border: `1.5px solid ${on ? colors.actionBlue : '#d8dce4'}`,
    background: on ? colors.liveBg : '#fff',
    color: on ? colors.deepBlue : '#6b7280',
    fontSize: 13.5,
    fontWeight: 600,
    cursor: 'pointer',
  })
  return (
    <div style={{ display: 'flex', gap: 9 }}>
      <button onClick={onLeft} style={seg(value === 'left')}>{left}</button>
      <button onClick={onRight} style={seg(value === 'right')}>{right}</button>
    </div>
  )
}

export const primaryBtn = (enabled = true): CSSProperties => ({
  width: '100%',
  padding: '16px 0',
  borderRadius: 15,
  border: 'none',
  background: enabled ? colors.deepBlue : '#c2c8d2',
  color: '#fff',
  fontSize: 15.5,
  fontWeight: 700,
  cursor: enabled ? 'pointer' : 'default',
  boxShadow: enabled ? '0 6px 16px rgba(62,137,190,.32)' : 'none',
})

export function CheckMedallion({ bg, stroke, size = 84 }: { bg: string; stroke: string; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
      }}
    >
      <svg width={size * 0.48} height={size * 0.48} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4,12 10,18 20,5" />
      </svg>
    </div>
  )
}
