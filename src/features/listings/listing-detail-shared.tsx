import { colors, shadow } from '../../theme'
import type { Listing } from '../../types'
import { PersonIcon, PinIcon } from '../../components/icons'
import { VerifiedBadge } from '../../components/Brand'

/** Listing-detail content blocks shared by the phone overlay and the desktop
 * detail page, so the two presentations can never drift. */

export function ListingTagChips({ tags }: { tags: readonly string[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, margin: '18px 0 22px' }}>
      {tags.map((t) => (
        <span
          key={t}
          style={{
            background: colors.paper,
            color: '#6b7280',
            fontSize: 12.5,
            fontWeight: 600,
            padding: '6px 12px',
            borderRadius: 9,
          }}
        >
          {t}
        </span>
      ))}
    </div>
  )
}

export function ListingOwnerCard({ listing }: { listing: Listing }) {
  const orgName = listing.org ?? listing.lister ?? 'Individual lister'
  const orgRole = listing.org ? 'Verified partner organisation' : 'Individual lister'
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        background: '#fff',
        borderRadius: 15,
        padding: '13px 15px',
        boxShadow: shadow.cardSm,
        marginBottom: 22,
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 11,
          background: colors.paper,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 'none',
        }}
      >
        <PersonIcon size={20} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14.5, fontWeight: 700, color: colors.ink }}>{orgName}</span>
          {listing.verified && <VerifiedBadge size={16} />}
        </div>
        <div style={{ fontSize: 12, color: colors.textSecondaryAlt, marginTop: 1 }}>{orgRole}</div>
      </div>
    </div>
  )
}

export function ListingAreaNote({ area }: { area: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        background: colors.paper,
        borderRadius: 13,
        padding: '13px 15px',
        marginBottom: 20,
      }}
    >
      <PinIcon size={18} stroke={colors.faint} style={{ flex: 'none' }} />
      <span style={{ fontSize: 12.5, color: '#6b7280', lineHeight: 1.45 }}>
        General area: <strong style={{ color: colors.ink }}>{area}</strong>. Exact location is shared after your
        inquiry.
      </span>
    </div>
  )
}

export function ListingStory({ listing }: { listing: Listing }) {
  return (
    <>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: colors.ink, margin: '0 0 9px' }}>About {listing.name}</h2>
      <p style={{ fontSize: 14.5, color: '#565b63', lineHeight: 1.65, margin: '0 0 22px', maxWidth: '65ch' }}>
        {listing.story}
      </p>
    </>
  )
}

export function AdoptAction({ applied, onApply }: { applied: boolean; onApply: () => void }) {
  if (applied) {
    return (
      <div
        style={{
          width: '100%',
          padding: '16px 0',
          borderRadius: 16,
          background: '#E8F3FB',
          color: colors.deepBlue,
          fontSize: 15,
          fontWeight: 700,
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={colors.deepBlue}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <polyline points="4,12 10,18 20,5" />
        </svg>
        Inquiry sent
      </div>
    )
  }
  return (
    <button
      onClick={onApply}
      style={{
        width: '100%',
        padding: '16px 0',
        borderRadius: 16,
        border: 'none',
        background: colors.deepBlue,
        color: '#fff',
        fontSize: 15.5,
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: shadow.raisedLg,
      }}
    >
      Apply to adopt
    </button>
  )
}
