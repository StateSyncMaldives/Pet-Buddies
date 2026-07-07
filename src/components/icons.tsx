// Simple stroked SVG icons, matching the prototype. Inherit colour via `stroke` prop.
import type { CSSProperties } from 'react'

interface IconProps {
  size?: number
  stroke?: string
  strokeWidth?: number
  style?: CSSProperties
}

const base = (size: number) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none' })

export function SearchIcon({ size = 17, stroke = '#b3aea4', strokeWidth = 2 }: IconProps) {
  return (
    <svg {...base(size)} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.5" y2="16.5" />
    </svg>
  )
}

export function HeartIcon({ size = 19, stroke, fill = 'none', strokeWidth = 2 }: IconProps & { fill?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={strokeWidth} aria-hidden>
      <path d="M12 21s-8-5.3-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.7-8 11-8 11z" />
    </svg>
  )
}

export function ShieldIcon({ size = 18, stroke = '#8a857c', strokeWidth = 2 }: IconProps) {
  return (
    <svg {...base(size)} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" aria-hidden>
      <path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z" />
      <polyline points="9,11.5 11,13.5 15,9" />
    </svg>
  )
}

export function ShareIcon({ size = 18, stroke = '#232826', strokeWidth = 2 }: IconProps) {
  return (
    <svg {...base(size)} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v13" />
      <polyline points="8,7 12,3 16,7" />
      <path d="M7 11H5v9h14v-9h-2" />
    </svg>
  )
}

export function PlusIcon({ size = 18, stroke = '#fff', strokeWidth = 2.6 }: IconProps) {
  return (
    <svg {...base(size)} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" aria-hidden>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

export function ChevronLeftIcon({ size = 18, stroke = '#232826', strokeWidth = 2.4 }: IconProps) {
  return (
    <svg {...base(size)} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="15,5 8,12 15,19" />
    </svg>
  )
}

export function PinIcon({ size = 18, stroke = '#a9a399', strokeWidth = 2, style }: IconProps) {
  return (
    <svg {...base(size)} stroke={stroke} strokeWidth={strokeWidth} style={style} aria-hidden>
      <path d="M12 22s7-7.6 7-13a7 7 0 1 0-14 0c0 5.4 7 13 7 13z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  )
}

export function PersonIcon({ size = 20, stroke = '#b3aea4', strokeWidth = 2 }: IconProps) {
  return (
    <svg {...base(size)} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
    </svg>
  )
}

export function GridIcon({ size = 23, stroke, strokeWidth = 2 }: IconProps) {
  return (
    <svg {...base(size)} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
    </svg>
  )
}

export function CrossIcon({ size = 23, stroke, strokeWidth = 2 }: IconProps) {
  return (
    <svg {...base(size)} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  )
}

export function CatIcon({ size = 18, stroke = 'currentColor', strokeWidth = 2 }: IconProps) {
  return (
    <svg {...base(size)} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 9 4 4l4 2.6a7 7 0 0 1 8 0L20 4l-1 5a6.3 6.3 0 0 1 .8 3c0 3.6-3 6.3-7 6.3S5.2 15.6 5.2 12A6.3 6.3 0 0 1 5 9z" />
      <path d="M9.5 12h.01M14.5 12h.01" />
      <path d="M12 14.5v1M12 15.5l-2.5 1M12 15.5l2.5 1" />
    </svg>
  )
}

export function BirdIcon({ size = 18, stroke = 'currentColor', strokeWidth = 2 }: IconProps) {
  return (
    <svg {...base(size)} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 6a4 4 0 0 0-4 4c0 2-1 3.6-3 4.6-2 1-3 1.6-3 3.4 4 .5 7-1 8.5-3.2C15 16.6 18 13.6 18 9.6a4 4 0 0 0-3-3.6z" />
      <path d="M15 6l4-1.6" />
      <path d="M9 17c1.6-1.6 2.6-3.6 3-6" />
      <path d="M15.4 8.4h.01" />
    </svg>
  )
}
