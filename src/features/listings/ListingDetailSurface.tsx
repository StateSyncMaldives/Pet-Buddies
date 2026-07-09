import { Link } from '@tanstack/react-router'
import { ChevronLeftIcon, HeartIcon, ShareIcon } from '../../components/icons'
import { PetPhoto } from '../../components/Brand'
import type { BrowseSearchUrl } from '../../router/browse-search'
import { getDetailPath, ROUTE_PATHS } from '../../router/paths'
import { detailMeta, useStore } from '../../store/store'
import { colors } from '../../theme'
import type { Listing } from '../../types'
import {
  AdoptAction,
  ListingAreaNote,
  ListingOwnerCard,
  ListingStory,
  ListingTagChips,
} from './listing-detail-shared'

/** Desktop (>900px) listing detail: a route-rendered two-pane page: media
 * left, facts and actions in a sticky right pane. The phone/column widths keep
 * the store-driven DetailOverlay presentation. */
export function ListingDetailSurface({ listing }: { listing: Listing }) {
  const { state, toggleSave, applyToAdopt, reportListing, showToast } = useStore()

  const saved = state.saved.includes(listing.id)
  const applied = state.applied.includes(listing.id)

  const onShare = async () => {
    const url = `${location.origin}${getDetailPath(listing.id)}`
    const text = `Meet ${listing.name}: ${detailMeta(listing)}. Looking for a home in ${listing.area}.`
    try {
      if (navigator.share) {
        await navigator.share({ title: `${listing.name} - Pet Buddies`, text, url })
      } else {
        await navigator.clipboard.writeText(url)
        showToast('Link copied')
      }
    } catch {
      /* user dismissed the share sheet */
    }
  }

  return (
    <div style={{ padding: '28px 0 80px' }}>
      <Link
        to={ROUTE_PATHS.browse}
        search={(prev: BrowseSearchUrl) => prev}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          color: colors.textSecondary,
          fontSize: 13.5,
          fontWeight: 600,
          textDecoration: 'none',
          marginBottom: 22,
        }}
      >
        <ChevronLeftIcon size={15} />
        Back to Browse
      </Link>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 7fr) minmax(320px, 5fr)',
          gap: 36,
          alignItems: 'start',
        }}
      >
        <div
          style={{
            position: 'relative',
            aspectRatio: '4 / 3',
            background: colors.photoTint,
            borderRadius: 18,
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
            silhouetteWidth={listing.species === 'cat' ? 260 : 230}
            silhouetteHeight={220}
          />
        </div>

        <div style={{ position: 'sticky', top: 28 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <h1
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: colors.ink,
                  letterSpacing: '-0.02em',
                  margin: 0,
                  textWrap: 'balance',
                }}
              >
                {listing.name}
              </h1>
              <div style={{ fontSize: 14.5, color: colors.textSecondary, marginTop: 5 }}>{detailMeta(listing)}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, flex: 'none', paddingTop: 4 }}>
              <button onClick={onShare} aria-label={`Share ${listing.name}`} className="pb-detail-iconbtn">
                <ShareIcon size={17} stroke={colors.ink} />
              </button>
              <button
                onClick={() => toggleSave(listing.id)}
                aria-label={saved ? 'Remove from saved' : 'Save'}
                aria-pressed={saved}
                className="pb-detail-iconbtn"
              >
                {saved ? (
                  <HeartIcon size={19} fill={colors.blush} stroke="none" />
                ) : (
                  <HeartIcon size={19} stroke="#C9A6B6" strokeWidth={2} />
                )}
              </button>
            </div>
          </div>

          <ListingTagChips tags={listing.tags} />
          <ListingOwnerCard listing={listing} />
          <ListingAreaNote area={listing.area} />

          <div style={{ margin: '4px 0 18px' }}>
            <AdoptAction applied={applied} onApply={() => applyToAdopt(listing.id)} />
          </div>

          <ListingStory listing={listing} />

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
    </div>
  )
}
