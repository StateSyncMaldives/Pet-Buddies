import { colors, shadow, z } from '../theme'
import { listMeta, orgLine, useStore } from '../store/store'
import { OverlayHeader, PetThumb, InfoNote, FieldLabel } from '../components/primitives'
import { OverlaySurface } from '../components/OverlaySurface'

export function InquiryOverlay() {
  const { state, listings, cancelInquiry, setInquiryMessage, sendInquiry } = useStore()
  if (state.overlay !== 'inquiry' || !state.inquiry.listingId) return null

  const listing = listings.find((l) => l.id === state.inquiry.listingId)
  if (!listing) return null
  const to = orgLine(listing)

  return (
    <OverlaySurface
      label="Adoption inquiry"
      zIndex={z.inquiry}
      onDismiss={cancelInquiry}
      width={560}
      dismissOnScrim={false}
    >
      <OverlayHeader onCancel={cancelInquiry} title="Adoption inquiry" />
      <div className="pbscroll" style={{ flex: 1, overflowY: 'auto', padding: '10px 20px calc(30px + env(safe-area-inset-bottom, 0px))' }}>
        {/* Pet summary */}
        <div
          style={{
            display: 'flex',
            gap: 13,
            alignItems: 'center',
            background: '#fff',
            borderRadius: 16,
            boxShadow: shadow.cardSm,
            padding: 13,
            marginBottom: 22,
          }}
        >
          <PetThumb species={listing.species} photo={listing.photo} name={listing.name} size={58} radius={13} />
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: colors.ink }}>{listing.name}</div>
            <div style={{ fontSize: 12.5, color: colors.textSecondary, margin: '2px 0 4px' }}>
              {listMeta(listing)}
            </div>
            <div style={{ fontSize: 12, color: colors.textSecondaryAlt }}>To {to}</div>
          </div>
        </div>

        <FieldLabel>Your message</FieldLabel>
        <textarea
          value={state.inquiry.message}
          onChange={(e) => setInquiryMessage(e.target.value)}
          style={{
            width: '100%',
            height: 148,
            padding: '14px 15px',
            borderRadius: 14,
            border: `1.5px solid ${colors.line}`,
            background: '#fff',
            fontSize: 14.5,
            color: colors.ink,
            lineHeight: 1.55,
            resize: 'none',
          }}
        />
        <div style={{ marginTop: 14 }}>
          <InfoNote>
            Your name and email are shared with the lister only when you send. Meet in a public place
            for the first handover.
          </InfoNote>
        </div>
      </div>

      <div style={{ padding: '14px 20px 22px', background: colors.appBg, borderTop: `1px solid ${colors.lineAlt}`, flex: 'none' }}>
        <button
          onClick={sendInquiry}
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
          Send inquiry
        </button>
      </div>
    </OverlaySurface>
  )
}
