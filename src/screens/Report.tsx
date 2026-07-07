import { useRef } from 'react'

import { colors } from '../theme'
import { BIRD_SPECIES } from '../data/seed'
import { isBirdSpecies } from '../server/contracts/api'
import { MEDIA_UPLOAD_MAX_LABEL } from '../server/domain/media/media-upload-policy'
import { useStore } from '../store/store'
import { Screen } from '../layout/primitives'
import { ButtonPair, CheckMedallion, FieldLabel, inputStyle } from '../components/primitives'

export function Report() {
  const { state, patchRep, useMyLocation, setReportPhoto, removeReportPhoto, submitReport, resetReport } = useStore()
  const { rep, reportDone, reportReceipt } = state
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (reportDone) {
    return (
      <Screen maxWidth={640}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: 80 }}>
          <CheckMedallion bg="#E8F3FB" stroke={colors.actionBlue} />
          <h2 style={{ fontSize: 22, fontWeight: 700, color: colors.ink, margin: '0 0 10px' }}>Report sent</h2>
          <p style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 1.55, maxWidth: 280, margin: '0 0 6px' }}>
            Routed to <strong style={{ color: colors.ink }}>{reportReceipt?.routedTo ?? 'Partner organisation'}</strong> — the closest partner
            org to your area. They'll follow up if they can help.
          </p>
          <p style={{ fontSize: 12.5, color: colors.faintAlt, margin: '0 0 30px' }}>Reference #{reportReceipt?.referenceCode ?? 'MV0000'}</p>
          <button
            onClick={resetReport}
            style={{ padding: '13px 28px', borderRadius: 13, border: '1.5px solid #d8dce4', background: '#fff', color: colors.ink, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Done
          </button>
        </div>
      </Screen>
    )
  }

  return (
    <Screen
      title="Report a pet"
      subtitle="Lost, found, or a stray that needs help. It reaches the nearest partner org."
      maxWidth={640}
    >

      <FieldLabel>What's happening?</FieldLabel>
      <div style={{ marginBottom: 20 }}>
        <ButtonPair
          left="Lost pet"
          right="Found / stray"
          value={rep.kind === 'lost' ? 'left' : 'right'}
          onLeft={() => patchRep({ kind: 'lost' })}
          onRight={() => patchRep({ kind: 'found' })}
        />
      </div>

      <FieldLabel>Species</FieldLabel>
      <div style={{ marginBottom: 20 }}>
        <ButtonPair
          left="Cat"
          right="Bird"
          value={rep.species === 'cat' ? 'left' : 'right'}
          onLeft={() => patchRep({ species: 'cat', birdSpecies: '' })}
          onRight={() => patchRep({ species: 'bird' })}
          padY={11}
        />
      </div>

      {rep.species === 'bird' && (
        <>
          <FieldLabel>Bird species</FieldLabel>
          <select
            value={rep.birdSpecies}
            onChange={(e) => patchRep({ birdSpecies: isBirdSpecies(e.target.value) ? e.target.value : '' })}
            style={{ ...inputStyle, marginBottom: 20 }}
          >
            <option value="">Select species</option>
            {BIRD_SPECIES.map((species) => (
              <option key={species} value={species}>
                {species}
              </option>
            ))}
          </select>
        </>
      )}

      <FieldLabel>Photo</FieldLabel>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void setReportPhoto(file)
          e.target.value = ''
        }}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        style={{
          width: '100%',
          height: 120,
          borderRadius: 15,
          border: `1.5px dashed ${rep.photo?.status === 'ready' ? colors.actionBlue : rep.photo?.status === 'error' ? '#e0938f' : '#d9d4ca'}`,
          background: rep.photo?.status === 'ready' ? '#F4FAFE' : '#fff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          cursor: 'pointer',
          marginBottom: rep.photo ? 8 : 20,
          overflow: 'hidden',
        }}
      >
        {rep.photo?.status === 'ready' ? (
          <>
            {rep.photo.previewUrl ? (
              <img
                src={rep.photo.previewUrl}
                alt="Report photo preview"
                style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover' }}
              />
            ) : (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={colors.actionBlue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4,12 10,18 20,5" />
              </svg>
            )}
            <span style={{ fontSize: 13, color: colors.actionBlue, fontWeight: 600 }}>Photo added</span>
          </>
        ) : rep.photo?.status === 'uploading' ? (
          <span style={{ fontSize: 13, color: colors.faint }}>Uploading…</span>
        ) : rep.photo?.status === 'error' ? (
          <span style={{ fontSize: 13, color: '#b4574f', fontWeight: 600 }}>
            {rep.photo.error ?? 'Upload failed.'} Tap to pick another photo.
          </span>
        ) : (
          <>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#b3aea4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="6" width="18" height="14" rx="2" />
              <circle cx="12" cy="13" r="3.5" />
              <path d="M8 6l1.5-2h5L16 6" />
            </svg>
            <span style={{ fontSize: 13, color: colors.faint }}>Add a photo — JPEG, PNG, or WebP, up to {MEDIA_UPLOAD_MAX_LABEL}</span>
          </>
        )}
      </button>
      {rep.photo && (
        <button
          onClick={removeReportPhoto}
          style={{
            background: 'none',
            border: 'none',
            color: colors.actionBlue,
            fontSize: 12.5,
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
            marginBottom: 20,
          }}
        >
          Remove photo
        </button>
      )}

      <FieldLabel>Location</FieldLabel>
      <button
        onClick={useMyLocation}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          background: colors.liveBg,
          border: 'none',
          color: colors.deepBlue,
          fontSize: 12.5,
          fontWeight: 600,
          padding: '8px 13px',
          borderRadius: 999,
          cursor: 'pointer',
          marginBottom: 9,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.deepBlue} strokeWidth="2">
          <path d="M12 22s7-7.6 7-13a7 7 0 1 0-14 0c0 5.4 7 13 7 13z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
        Use my location
      </button>
      <input
        value={rep.area}
        onChange={(e) => patchRep({ area: e.target.value })}
        placeholder="Area, e.g. Maafannu, Malé"
        style={{ ...inputStyle, marginBottom: 20 }}
      />

      <FieldLabel>Description</FieldLabel>
      <textarea
        value={rep.desc}
        onChange={(e) => patchRep({ desc: e.target.value })}
        placeholder="Colour, collar, behaviour, anything that helps identify the animal…"
        style={{ ...inputStyle, height: 96, resize: 'none', marginBottom: 24 }}
      />

      <button
        onClick={submitReport}
        style={{
          width: '100%',
          padding: '16px 0',
          borderRadius: 15,
          border: 'none',
          background: colors.deepBlue,
          color: '#fff',
          fontSize: 15.5,
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 6px 16px rgba(111,184,224,.35)',
        }}
      >
        Send report
      </button>
    </Screen>
  )
}
