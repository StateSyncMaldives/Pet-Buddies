import { useNavigate } from '@tanstack/react-router'
import type { KeyboardEvent, MouseEvent } from 'react'
import { colors, shadow } from '../theme'
import { getDetailPath } from '../router/paths'
import { listMeta, useStore } from '../store/store'
import type { Listing } from '../types'
import { PetPhoto, VerifiedBadge } from './Brand'
import { HeartIcon } from './icons'

/** Compact Browse grid card: square photo + save heart, name, meta, area. */
export function ListingCard({ listing }: { listing: Listing }) {
  const navigate = useNavigate()
  const { state, toggleSave } = useStore()
  const saved = state.saved.includes(listing.id)

  const onSave = (e: MouseEvent) => {
    e.stopPropagation() // don't open detail when tapping the heart
    toggleSave(listing.id)
  }

  const open = () => navigate({ to: getDetailPath(listing.id), search: (prev) => prev })
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      open()
    }
  }

  return (
    <div
      onClick={open}
      onKeyDown={onKey}
      role="button"
      tabIndex={0}
      aria-label={`View ${listing.name}, ${listing.species} in ${listing.area}`}
      style={{
        background: '#fff',
        borderRadius: 18,
        boxShadow: shadow.card,
        overflow: 'hidden',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          position: 'relative',
          aspectRatio: '1 / 1',
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
          silhouetteWidth={listing.species === 'cat' ? 92 : 84}
          silhouetteHeight={78}
        />
        <button
          onClick={onSave}
          aria-label={saved ? 'Remove from saved' : 'Save'}
          aria-pressed={saved}
          style={{
            position: 'absolute',
            top: 9,
            right: 9,
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'rgba(255,255,255,.92)',
            border: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          {saved ? (
            <HeartIcon size={16} fill={colors.blush} stroke="none" />
          ) : (
            <HeartIcon size={16} stroke="#C9A6B6" strokeWidth={2} />
          )}
        </button>
      </div>
      <div style={{ padding: '10px 12px 13px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span
            style={{
              fontSize: 15.5,
              fontWeight: 700,
              color: colors.ink,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {listing.name}
          </span>
          {listing.verified && <VerifiedBadge size={14} />}
        </div>
        <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
          {listMeta(listing)}
        </div>
        <div style={{ fontSize: 11.5, color: colors.faint, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {listing.area}
        </div>
      </div>
    </div>
  )
}
