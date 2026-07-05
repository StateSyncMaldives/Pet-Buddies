import { colors, z } from '../theme'
import { useStore } from '../store/store'
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
  const { state, closeAdd, signOut, patchAdd, toggleAddTag, submitListing } = useStore()
  if (state.overlay !== 'add') return null

  const { add, user, addDone, addedName } = state
  const isBird = add.species === 'bird'
  const addTags = isBird ? BIRD_ADD_TAGS : CAT_ADD_TAGS
  const canSubmit = add.name.trim().length > 0

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
              Submit for review
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
