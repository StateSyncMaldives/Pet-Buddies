import { useNavigate, useRouteContext } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { colors, shadow } from '../../theme'
import { getDetailPath } from '../../router/paths'
import { mapListingDetailToListing } from '../../store/view-model-mappers'
import { queryKeys, youReadModelQuery } from '../../query/queries'
import { useStore } from '../../store/store'
import type { InboxView, Inquiry, Listing } from '../../types'
import { Segmented } from '../../components/Segmented'
import { Screen } from '../../layout/primitives'
import { PetThumb } from '../../components/primitives'
import { VerifiedBadge } from '../../components/Brand'
import { GridIcon, PersonIcon } from '../../components/icons'
import { AccountMenu } from '../auth/AccountMenu'

function statusChip(status: NonNullable<Listing['status']>) {
  switch (status) {
    case 'pending':
      return { label: 'Pending review', color: colors.pendingText, bg: colors.pendingBg }
    case 'adopted':
      return { label: 'Adopted', color: colors.adoptedText, bg: colors.adoptedBg }
    case 'rejected':
      return { label: 'Rejected', color: colors.rejectText, bg: colors.rejectBg }
    default:
      return { label: 'Live', color: colors.liveText, bg: colors.liveBg }
  }
}

export function Inbox({ view }: { view?: InboxView }) {
  const navigate = useNavigate()
  const { backend, viewer } = useRouteContext({ from: '__root__' })
  const viewerId = viewer.kind === 'user' ? viewer.id : undefined
  const queryClient = useQueryClient()
  const { state, openAdd, markAdopted } = useStore()
  const selectedView = view ?? state.inboxView
  const showMine = selectedView === 'listings'

  // Owned listings and sent inquiries read durable truth from the query cache
  // (ADR 0009), prefetched by the route loader.
  const { data: youReadModel } = useQuery(youReadModelQuery(backend, viewerId))

  const openListingDetail = (listingId: string) => navigate({ to: getDetailPath(listingId) })
  const setView = (nextView: InboxView) => navigate({ to: '/you', search: { view: nextView } })

  // Owned listings belong to the signed-in viewer resolved from the session,
  // not to the placeholder user the sign-in overlay used to set.
  const signedIn = viewer.kind === 'user'
  const myListings = signedIn && youReadModel ? youReadModel.ownedListings.map(mapListingDetailToListing) : []
  const inquiries = youReadModel ? youReadModel.sentAdoptionInquiries.map((inquiry): Inquiry => {
    const listing = youReadModel.ownedListings.find((item) => item.id === inquiry.listingId)
    const mappedListing = listing ? mapListingDetailToListing(listing) : undefined
    return {
      key: inquiry.id,
      listingId: inquiry.listingId,
      name: inquiry.listingName,
      to: inquiry.recipientDisplayName,
      verified: mappedListing?.verified ?? false,
      message: inquiry.message,
      isCat: mappedListing?.species !== 'bird',
      isBird: mappedListing?.species === 'bird',
      tint: mappedListing?.tint ?? '#FBE3EC',
      status: inquiry.status === 'awaiting_reply' ? 'Awaiting reply' : inquiry.status,
    }
  }) : []
  const nInq = inquiries.length

  return (
    <Screen title="You" maxWidth={760}>
      <div style={{ marginBottom: 22 }}>
        <AccountMenu />
      </div>

      <div style={{ marginBottom: 22 }}>
        <Segmented
          options={['Inquiries', 'My listings']}
          activeIndex={showMine ? 1 : 0}
          onSelect={(i) => setView(i === 0 ? 'inquiries' : 'listings')}
          fontSize={14}
        />
      </div>

      {showMine ? (
        !signedIn ? (
          <EmptyState
            icon={<PersonIcon size={46} stroke="#cfd4dc" strokeWidth={1.7} />}
            text="Sign in to list a pet and manage your listings."
            cta="List a pet"
            onCta={openAdd}
            pad={64}
          />
        ) : myListings.length === 0 ? (
          <EmptyState
            icon={<GridIcon size={44} stroke="#cfd4dc" strokeWidth={1.7} />}
            text="Pets you list will appear here. New listings go through a quick review before they're live."
            cta="List a pet"
            onCta={openAdd}
            pad={64}
          />
        ) : (
          myListings.map((l) => {
            const status = l.status ?? 'live'
            const chip = statusChip(status)
            return (
              <div
                key={l.id}
                style={{ background: '#fff', borderRadius: 16, boxShadow: shadow.cardSm, padding: 13, marginBottom: 12 }}
              >
                <div
                  onClick={status === 'live' ? () => openListingDetail(l.id) : undefined}
                  onKeyDown={status === 'live' ? (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openListingDetail(l.id) } } : undefined}
                  role={status === 'live' ? 'button' : undefined}
                  tabIndex={status === 'live' ? 0 : undefined}
                  aria-label={status === 'live' ? `View ${l.name}` : undefined}
                  style={{ display: 'flex', gap: 12, alignItems: 'center', cursor: status === 'live' ? 'pointer' : 'default' }}
                >
                  <PetThumb species={l.species} photo={l.photo} name={l.name} size={56} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: colors.ink }}>{l.name}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: chip.color, background: chip.bg, padding: '3px 9px', borderRadius: 7, whiteSpace: 'nowrap' }}>
                        {chip.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 12.5, color: colors.textSecondary, marginTop: 3 }}>
                      {(l.species === 'cat' ? l.age : `${l.breed} · ${l.age}`) + ' · ' + l.area}
                    </div>
                  </div>
                </div>
                {status === 'live' && (
                  <button
                    onClick={async () => {
                      // Await the durable transition, then invalidate the You and
                      // Browse reads so both reflect the new status (ADR 0009).
                      await markAdopted(l.id)
                      await Promise.all([
                        queryClient.invalidateQueries({ queryKey: queryKeys.you }),
                        queryClient.invalidateQueries({ queryKey: ['browse'] }),
                      ])
                    }}
                    style={{
                      width: '100%',
                      marginTop: 12,
                      padding: '11px 0',
                      borderRadius: 11,
                      border: '1.5px solid #cfe6d3',
                      background: '#F1F8F2',
                      color: colors.adoptedText,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Mark as adopted
                  </button>
                )}
              </div>
            )
          })
        )
      ) : (
        <>
          <p style={{ fontSize: 13, color: colors.faint, margin: '-6px 0 18px' }}>
            {nInq ? `${nInq} ${nInq === 1 ? 'inquiry' : 'inquiries'} sent.` : 'No inquiries yet.'}
          </p>
          {nInq === 0 ? (
            <EmptyState
              icon={
                <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#cfd4dc" strokeWidth="1.7" strokeLinejoin="round">
                  <rect x="3" y="5" width="18" height="14" rx="2.5" />
                  <path d="M3.5 7l8.5 6 8.5-6" />
                </svg>
              }
              text="When you apply to adopt, your inquiries to listers show up here."
              pad={88}
            />
          ) : (
            inquiries.map((q) => (
              <div
                key={q.key}
                onClick={() => openListingDetail(q.listingId)}
                onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openListingDetail(q.listingId) } }}
                role="button"
                tabIndex={0}
                aria-label={`View inquiry about ${q.name}`}
                style={{ background: '#fff', borderRadius: 16, boxShadow: shadow.cardSm, padding: 14, marginBottom: 12, cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <PetThumb species={q.isCat ? 'cat' : 'bird'} size={50} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: colors.ink }}>{q.name}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: colors.pendingText, background: colors.pendingBg, padding: '3px 9px', borderRadius: 7, whiteSpace: 'nowrap' }}>
                        {q.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                      <span style={{ fontSize: 12.5, color: colors.textSecondaryAlt }}>To {q.to}</span>
                      {q.verified && <VerifiedBadge size={14} />}
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5, margin: '11px 0 0', background: '#F0F2F6', borderRadius: 10, padding: '10px 12px' }}>
                  "{q.message}"
                </p>
              </div>
            ))
          )}
        </>
      )}
    </Screen>
  )
}

function EmptyState({ icon, text, cta, onCta, pad }: {
  icon: React.ReactNode
  text: string
  cta?: string
  onCta?: () => void
  pad: number
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: pad }}>
      {icon}
      <p style={{ fontSize: 14, color: colors.faint, lineHeight: 1.55, maxWidth: 240, margin: cta ? '18px 0 18px' : '18px 0 0' }}>
        {text}
      </p>
      {cta && onCta && (
        <button
          onClick={onCta}
          style={{ padding: '12px 24px', borderRadius: 13, border: 'none', background: colors.deepBlue, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
        >
          {cta}
        </button>
      )}
    </div>
  )
}
