import { colors, shadow, z } from '../theme'
import { detailMeta, useStore } from '../store/store'
import { PersonIcon, ChevronLeftIcon, HeartIcon, PinIcon, ShareIcon } from '../components/icons'
import { PetPhoto, VerifiedBadge } from '../components/Brand'
import { petUrl } from '../petLink'

export function DetailOverlay() {
  const { state, listings, toggleSave, closeDetail, applyToAdopt, reportListing, showToast } = useStore()
  if (state.overlay !== 'detail' || !state.detailId) return null

  const listing = listings.find((l) => l.id === state.detailId)
  if (!listing) return null

  const saved = state.saved.includes(listing.id)
  const applied = state.applied.includes(listing.id)
  const orgName = listing.org ?? listing.lister ?? 'Individual lister'
  const orgRole = listing.org ? 'Verified partner organisation' : 'Individual lister'

  const onShare = async () => {
    const url = petUrl(listing.id)
    const text = `Meet ${listing.name} — ${detailMeta(listing)}. Looking for a home in ${listing.area}.`
    try {
      if (navigator.share) {
        await navigator.share({ title: `${listing.name} · Pet Buddies`, text, url })
      } else {
        await navigator.clipboard.writeText(url)
        showToast('Link copied')
      }
    } catch {
      /* user dismissed the share sheet */
    }
  }

  return (
    <div
      className="pb-overlay"
      style={{
        background: colors.appBg,
        zIndex: z.detail,
        display: 'flex',
        flexDirection: 'column',
        animation: 'pb-overlay-in .22s cubic-bezier(.4,0,.2,1)',
      }}
    >
      <div className="pbscroll" style={{ flex: 1, overflowY: 'auto' }}>
        {/* Hero */}
        <div
          style={{
            position: 'relative',
            height: 320,
            background: colors.photoTint,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <PetPhoto
            photo={listing.photo}
            species={listing.species}
            name={listing.name}
            silhouetteWidth={listing.species === 'cat' ? 190 : 170}
            silhouetteHeight={160}
          />
          <button
            onClick={closeDetail}
            aria-label="Back"
            style={circleBtn('left')}
          >
            <ChevronLeftIcon size={18} />
          </button>
          <button
            onClick={() => toggleSave(listing.id)}
            aria-label={saved ? 'Remove from saved' : 'Save'}
            aria-pressed={saved}
            style={circleBtn('right')}
          >
            {saved ? (
              <HeartIcon size={20} fill={colors.blush} stroke="none" />
            ) : (
              <HeartIcon size={20} stroke="#C9A6B6" strokeWidth={2} />
            )}
          </button>
          <button
            onClick={onShare}
            aria-label={`Share ${listing.name}`}
            style={{ ...circleBtn('right'), right: 64 }}
          >
            <ShareIcon size={18} stroke={colors.ink} />
          </button>
        </div>

        <div style={{ padding: '22px 22px 130px' }}>
          <h1 style={{ fontSize: 27, fontWeight: 700, color: colors.ink, letterSpacing: '-0.02em', margin: 0 }}>
            {listing.name}
          </h1>
          <div style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>
            {detailMeta(listing)}
          </div>

          {/* Tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, margin: '18px 0 22px' }}>
            {listing.tags.map((t) => (
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

          {/* Org row */}
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

          <h2 style={{ fontSize: 15, fontWeight: 700, color: colors.ink, margin: '0 0 9px' }}>
            About {listing.name}
          </h2>
          <p style={{ fontSize: 14.5, color: '#565b63', lineHeight: 1.65, margin: '0 0 22px' }}>
            {listing.story}
          </p>

          {/* Privacy note */}
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
              General area: <strong style={{ color: colors.ink }}>{listing.area}</strong>. Exact
              location is shared after your inquiry.
            </span>
          </div>

          <button
            onClick={reportListing}
            style={{
              background: 'none',
              border: 'none',
              color: colors.faintAlt,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              padding: '4px 0',
            }}
          >
            ⚑ Report this listing
          </button>
        </div>
      </div>

      {/* Sticky footer */}
      <div
        style={{
          padding: '14px 22px calc(22px + env(safe-area-inset-bottom, 0px))',
          background: 'linear-gradient(transparent, #F7F8FA 30%)',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        }}
      >
        {applied ? (
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.deepBlue} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4,12 10,18 20,5" />
            </svg>
            Inquiry sent
          </div>
        ) : (
          <button
            onClick={() => applyToAdopt(listing.id)}
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
        )}
      </div>
    </div>
  )
}

function circleBtn(side: 'left' | 'right'): React.CSSProperties {
  return {
    position: 'absolute',
    top: 14,
    [side]: 16,
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: 'rgba(255,255,255,.92)',
    border: 'none',
    boxShadow: '0 2px 8px rgba(0,0,0,.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  }
}
