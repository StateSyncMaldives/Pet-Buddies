import { useRef } from 'react'

import { colors, z } from '../theme'
import { useStore } from '../store/store'
import { MAX_LISTING_IMAGES } from '../server/domain/listings/create-listing'
import { MEDIA_UPLOAD_MAX_LABEL } from '../server/domain/media/media-upload-policy'
import { BIRD_ADD_TAGS, BIRD_SPECIES, CAT_ADD_TAGS } from '../data/seed'
import {
  ButtonPair,
  CheckMedallion,
  FieldLabel,
  InfoNote,
  OverlayHeader,
  WarnCircle,
  inputStyle,
  primaryBtn,
} from '../components/primitives'
import { OverlaySurface } from '../components/OverlaySurface'

export function AddOverlay() {
  const { state, closeAdd, signOut, patchAdd, toggleAddTag, addListingImages, removeListingImage, submitListing } = useStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  if (state.overlay !== 'add') return null

  const { add, user, addDone, addedName } = state
  const isBird = add.species === 'bird'
  const addTags = isBird ? BIRD_ADD_TAGS : CAT_ADD_TAGS
  const uploading = add.images.some((image) => image.status === 'uploading')
  const canSubmit = add.name.trim().length > 0 && !uploading

  return (
    <OverlaySurface label="New listing" zIndex={z.add} onDismiss={closeAdd} width={720}>
      <OverlayHeader onCancel={closeAdd} title="New listing" />
      <div className="pbscroll" style={{ flex: 1, overflowY: 'auto', padding: '8px 20px calc(40px + env(safe-area-inset-bottom, 0px))' }}>
        {!addDone ? (
          <>
            {/* Posting-as bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: colors.liveBg,
                borderRadius: 12,
                padding: '10px 13px',
                marginBottom: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: colors.actionBlue,
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {(user?.name ?? 'U').charAt(0).toUpperCase()}
                </span>
                <span style={{ fontSize: 12.5, color: colors.deepBlue }}>
                  Posting as <strong style={{ color: '#1f6a9b' }}>{user?.name}</strong>
                </span>
              </div>
              <button
                onClick={signOut}
                style={{ background: 'none', border: 'none', color: colors.actionBlue, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
              >
                Sign out
              </button>
            </div>

            <FieldLabel>Species</FieldLabel>
            <div style={{ marginBottom: 20 }}>
              <ButtonPair
                left="Cat"
                right="Bird"
                value={isBird ? 'right' : 'left'}
                onLeft={() => patchAdd({ species: 'cat', tags: [] })}
                onRight={() => patchAdd({ species: 'bird', tags: [] })}
                padY={11}
              />
            </div>

            {isBird && (
              <>
                <FieldLabel>Bird species</FieldLabel>
                <select
                  value={add.breed}
                  onChange={(e) => patchAdd({ breed: e.target.value })}
                  style={{ ...inputStyle, marginBottom: 7 }}
                >
                  {BIRD_SPECIES.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
                <div style={{ marginBottom: 20 }}>
                  <InfoNote tone="amber" icon={<WarnCircle />}>
                    Only legally importable pet birds can be listed. Native &amp; protected species
                    are not allowed.
                  </InfoNote>
                </div>
              </>
            )}

            <FieldLabel>Photos</FieldLabel>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => {
                const files = Array.from(e.target.files ?? [])
                if (files.length > 0) void addListingImages(files)
                e.target.value = ''
              }}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 6 }}>
              {add.images.map((image) => (
                <div key={image.id} style={{ position: 'relative', width: 72 }}>
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 12,
                      overflow: 'hidden',
                      border: `1.5px solid ${image.status === 'error' ? '#e0938f' : '#e3e0d8'}`,
                      background: '#f6f4ef',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {image.previewUrl ? (
                      <img
                        src={image.previewUrl}
                        alt={image.fileName}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: image.status === 'uploading' ? 0.5 : 1 }}
                      />
                    ) : (
                      <span style={{ fontSize: 10, color: colors.faint, padding: 4, textAlign: 'center' }}>{image.fileName}</span>
                    )}
                  </div>
                  {image.status === 'uploading' && (
                    <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: colors.deepBlue }}>
                      Uploading…
                    </span>
                  )}
                  {image.status === 'error' && (
                    <span style={{ display: 'block', fontSize: 10, color: '#b4574f', marginTop: 3 }}>
                      {image.error ?? 'Upload failed'}
                    </span>
                  )}
                  <button
                    onClick={() => removeListingImage(image.id)}
                    aria-label={`Remove ${image.fileName}`}
                    style={{
                      position: 'absolute',
                      top: -6,
                      right: -6,
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      border: 'none',
                      background: colors.ink,
                      color: '#fff',
                      fontSize: 11,
                      lineHeight: 1,
                      cursor: 'pointer',
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              {add.images.length < MAX_LISTING_IMAGES && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 12,
                    border: '1.5px dashed #d9d4ca',
                    background: '#fff',
                    color: colors.faint,
                    fontSize: 22,
                    cursor: 'pointer',
                  }}
                >
                  +
                </button>
              )}
            </div>
            <p style={{ fontSize: 11.5, color: colors.faintAlt, margin: '0 0 18px' }}>
              Up to {MAX_LISTING_IMAGES} photos — JPEG, PNG, or WebP, {MEDIA_UPLOAD_MAX_LABEL} each. The first photo is the cover.
            </p>

            <FieldLabel>Name</FieldLabel>
            <input
              value={add.name}
              onChange={(e) => patchAdd({ name: e.target.value })}
              placeholder="e.g. Mishka"
              style={{ ...inputStyle, marginBottom: 18 }}
            />

            <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
              <div style={{ flex: 1 }}>
                <FieldLabel>Age</FieldLabel>
                <input
                  value={add.age}
                  onChange={(e) => patchAdd({ age: e.target.value })}
                  placeholder="e.g. 8 months"
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: 1 }}>
                <FieldLabel>Area</FieldLabel>
                <input
                  value={add.area}
                  onChange={(e) => patchAdd({ area: e.target.value })}
                  placeholder="e.g. Maafannu"
                  style={inputStyle}
                />
              </div>
            </div>

            <FieldLabel>Tags</FieldLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {addTags.map((label) => {
                const active = add.tags.includes(label)
                return (
                  <button
                    key={label}
                    onClick={() => toggleAddTag(label)}
                    style={{
                      border: `1.5px solid ${active ? colors.deepBlue : '#d8dce4'}`,
                      background: active ? colors.deepBlue : '#fff',
                      color: active ? '#fff' : '#6b7280',
                      padding: '7px 13px',
                      borderRadius: 999,
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>

            <FieldLabel>Description</FieldLabel>
            <textarea
              value={add.desc}
              onChange={(e) => patchAdd({ desc: e.target.value })}
              placeholder="Personality, health, why they need a home…"
              style={{ ...inputStyle, height: 90, resize: 'none', marginBottom: 14 }}
            />

            <div style={{ marginBottom: 22 }}>
              <InfoNote>
                Individual listings get a quick manual review before going live — usually within a
                day.
              </InfoNote>
            </div>

            <button onClick={submitListing} style={primaryBtn(canSubmit)}>
              {uploading ? 'Uploading photos…' : 'Submit for review'}
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: 70 }}>
            <CheckMedallion bg="#FCEEF4" stroke={colors.wordmarkPink} />
            <h2 style={{ fontSize: 22, fontWeight: 700, color: colors.ink, margin: '0 0 10px' }}>Submitted!</h2>
            <p style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 1.55, maxWidth: 280, margin: '0 0 30px' }}>
              <strong style={{ color: colors.ink }}>{addedName}</strong> is in the review queue.
              We'll check it for spam &amp; protected species, then publish — usually within a day.
            </p>
            <button
              onClick={closeAdd}
              style={{
                padding: '13px 28px',
                borderRadius: 13,
                border: '1.5px solid #d8dce4',
                background: '#fff',
                color: colors.ink,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Back to browse
            </button>
          </div>
        )}
      </div>
    </OverlaySurface>
  )
}
