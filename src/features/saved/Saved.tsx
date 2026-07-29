import { Link, useNavigate, useRouteContext } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { KeyboardEvent, MouseEvent } from 'react'
import { colors, shadow } from '../../theme'
import { CardGrid, Screen } from '../../layout/primitives'
import { ROUTE_PATHS, getDetailPath } from '../../router/paths'
import { mapListingDetailToListing } from '../../store/view-model-mappers'
import { queryKeys, savedListingsQuery } from '../../query/queries'
import { listMeta, orgLine, useStore } from '../../store/store'
import { PetPhoto, VerifiedBadge } from '../../components/Brand'
import { HeartIcon } from '../../components/icons'

export function Saved() {
  const navigate = useNavigate()
  const { backend, viewer } = useRouteContext({ from: '__root__' })
  const viewerId = viewer.kind === 'user' ? viewer.id : undefined
  const queryClient = useQueryClient()
  const { toggleSave } = useStore()
  // Saved listings read durable truth from the query cache (ADR 0009),
  // prefetched by the route loader.
  const { data } = useQuery(savedListingsQuery(backend, viewerId))
  const savedFeed = (data?.items ?? []).map(mapListingDetailToListing)

  const empty = savedFeed.length === 0
  const sub = empty
    ? 'Nothing saved yet.'
    : `${savedFeed.length} budd${savedFeed.length === 1 ? 'y' : 'ies'} saved.`
  return (
    <Screen title="Saved" subtitle={sub}>
      {empty && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: 80 }}>
          <HeartIcon size={46} stroke="#cfd4dc" strokeWidth={1.8} />
          <p style={{ fontSize: 14, color: colors.faint, lineHeight: 1.55, maxWidth: 240, margin: '18px 0 16px' }}>
            Save a listing with its heart and it'll show up here for easy comparing.
          </p>
          <Link
            to={ROUTE_PATHS.browse}
            style={{
              padding: '10px 20px',
              borderRadius: 11,
              border: '1.5px solid #d8dce4',
              background: '#fff',
              color: colors.ink,
              fontSize: 13.5,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Browse listings
          </Link>
        </div>
      )}

      <CardGrid>
      {savedFeed.map((l) => {
        const onRemove = async (e: MouseEvent) => {
          e.stopPropagation()
          // Await the durable write, then invalidate the saved read so it
          // refetches durable truth (ADR 0009).
          await toggleSave(l.id)
          await queryClient.invalidateQueries({ queryKey: queryKeys.saved })
        }
        return (
          <div
            key={l.id}
            onClick={() => navigate({ to: getDetailPath(l.id) })}
            onKeyDown={(e: KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                navigate({ to: getDetailPath(l.id) })
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={`View ${l.name}, ${l.species} in ${l.area}`}
            style={{
              display: 'flex',
              gap: 13,
              alignItems: 'center',
              background: '#fff',
              borderRadius: 16,
              boxShadow: shadow.cardSm,
              padding: 11,
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                position: 'relative',
                width: 66,
                height: 66,
                borderRadius: 12,
                background: colors.photoTint,
                overflow: 'hidden',
                flex: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PetPhoto
                photo={l.photo}
                species={l.species}
                name={l.name}
                silhouetteWidth={40}
                silhouetteHeight={34}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: colors.ink }}>{l.name}</div>
              <div style={{ fontSize: 12.5, color: colors.textSecondary, margin: '2px 0 4px' }}>
                {listMeta(l)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 12, color: colors.textSecondaryAlt }}>{orgLine(l)}</span>
                {l.verified && <VerifiedBadge size={14} />}
              </div>
            </div>
            <button
              onClick={onRemove}
              aria-label="Remove from saved"
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: '#FCEEF4',
                border: 'none',
                flex: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <HeartIcon size={18} fill={colors.blush} stroke="none" />
            </button>
          </div>
        )
      })}
      </CardGrid>
    </Screen>
  )
}
