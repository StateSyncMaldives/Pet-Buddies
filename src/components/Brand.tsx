import { colors, font } from '../theme'

/** Full-colour Pet Buddies mark (heart + sitting cat + birds). viewBox 0 0 260 210. */
export function LogoMark({ width = 38, height = 31 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 260 210" aria-hidden>
      <path
        d="M130,182 C66,140 36,108 36,76 C36,50 56,34 80,34 C99,34 119,48 130,68 C141,48 161,34 180,34 C204,34 224,50 224,76 C224,108 194,140 130,182 Z"
        fill="none"
        stroke={colors.heartPink}
        strokeWidth="7"
        strokeLinejoin="round"
      />
      <g fill={colors.powderBlue}>
        <polygon points="113,74 108,50 130,68" />
        <polygon points="147,74 152,50 130,68" />
        <circle cx="130" cy="86" r="20" />
        <path d="M118,100 C109,118 105,148 108,170 L152,170 C155,148 151,118 142,100 Z" />
        <path d="M150,166 C176,168 190,154 190,136 C190,125 183,119 176,122 C183,127 181,138 171,142 C161,146 150,153 150,166 Z" />
      </g>
      <circle cx="123" cy="86" r="2.6" fill="#fff" />
      <circle cx="137" cy="86" r="2.6" fill="#fff" />
      <g>
        <path
          d="M86,150 C72,150 64,140 64,128 C64,116 72,108 84,108 C92,108 98,112 100,120 C96,116 90,118 88,124 C92,122 96,124 96,130 C96,142 96,150 86,150 Z"
          fill={colors.blush}
        />
        <polygon points="64,124 52,128 64,132" fill={colors.sand} />
      </g>
    </svg>
  )
}

/** "PetBuddies" wordmark — Quicksand, blue "Pet" + pink "Buddies". */
export function Wordmark({ size = 19 }: { size?: number }) {
  return (
    <div style={{ fontFamily: font.brand, fontWeight: 600, fontSize: size, lineHeight: 1 }}>
      <span style={{ color: colors.actionBlue }}>Pet</span>
      <span style={{ color: colors.wordmarkPink }}>Buddies</span>
    </div>
  )
}

/** Blue medallion + white check shown beside verified-org names. */
export function VerifiedBadge({ size = 15 }: { size?: number }) {
  const check = Math.round(size * 0.6)
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: colors.actionBlue,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 'none',
      }}
    >
      <svg width={check} height={check} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="5,13 10,18 19,7" />
      </svg>
    </span>
  )
}

/**
 * Listing photo that fills its (relatively-positioned, overflow-hidden) container,
 * falling back to the species silhouette when a listing has no photo.
 */
export function PetPhoto({
  photo,
  species,
  name,
  silhouetteWidth,
  silhouetteHeight,
  silhouetteOpacity = 0.55,
}: {
  photo?: string
  species: 'cat' | 'bird'
  name: string
  silhouetteWidth: number
  silhouetteHeight: number
  silhouetteOpacity?: number
}) {
  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        loading="lazy"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      />
    )
  }
  return (
    <Silhouette
      species={species}
      width={silhouetteWidth}
      height={silhouetteHeight}
      opacity={silhouetteOpacity}
    />
  )
}

/** Faint white cat / bird silhouette used as the photo placeholder. */
export function Silhouette({ species, width = 120, height = 100, opacity = 0.5 }: {
  species: 'cat' | 'bird'
  width?: number
  height?: number
  opacity?: number
}) {
  if (species === 'cat') {
    return (
      <svg width={width} height={height} viewBox="0 0 200 180" style={{ opacity }} aria-hidden>
        <g fill="#fff">
          <polygon points="76,58 70,30 100,52" />
          <polygon points="124,58 130,30 100,52" />
          <circle cx="100" cy="74" r="28" />
          <path d="M84,92 C73,116 68,150 72,172 L128,172 C132,150 127,116 116,92 Z" />
        </g>
      </svg>
    )
  }
  return (
    <svg width={width} height={height} viewBox="0 0 200 180" style={{ opacity }} aria-hidden>
      <g fill="#fff">
        <path d="M118,150 C84,150 64,128 64,98 C64,70 86,52 116,52 C140,52 156,66 156,86 C148,76 132,80 126,94 C138,88 150,94 150,110 C150,140 150,150 118,150 Z" />
        <polygon points="64,92 38,100 64,108" />
      </g>
    </svg>
  )
}
