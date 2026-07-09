import { useNavigate } from '@tanstack/react-router'
import { colors, z } from '../../theme'
import { detailMeta, useStore } from '../../store/store'
import { ChevronLeftIcon, HeartIcon, ShareIcon } from '../../components/icons'
import { PetPhoto } from '../../components/Brand'
import type { BrowseSearchUrl } from '../../router/browse-search'
import { getDetailPath, ROUTE_PATHS } from '../../router/paths'
import {
  AdoptAction,
  ListingAreaNote,
  ListingOwnerCard,
  ListingStory,
  ListingTagChips,
} from './listing-detail-shared'

export function DetailOverlay() {
  const navigate = useNavigate()
  const { state, listings, toggleSave, applyToAdopt, reportListing, showToast } = useStore()
  if (state.overlay !== 'detail' || !state.detailId) return null

  const listing = listings.find((l) => l.id === state.detailId)
  if (!listing) return null

  const saved = state.saved.includes(listing.id)
  const applied = state.applied.includes(listing.id)

  const onShare = async () => {
    const url = `${location.origin}${getDetailPath(listing.id)}`
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
            onClick={() => navigate({ to: ROUTE_PATHS.browse, search: (prev: BrowseSearchUrl) => prev })}
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
          <div style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>{detailMeta(listing)}</div>

          <ListingTagChips tags={listing.tags} />
          <ListingOwnerCard listing={listing} />
          <ListingStory listing={listing} />
          <ListingAreaNote area={listing.area} />

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
            Report this listing
          </button>
        </div>
      </div>

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
        <AdoptAction applied={applied} onApply={() => applyToAdopt(listing.id)} />
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
