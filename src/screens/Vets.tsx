import { colors, shadow } from '../theme'
import type { ClinicSummary } from '../server/contracts/api'
import { mapClinicSummaryToClinic } from '../store/view-model-mappers'
import { useStore } from '../store/store'

export function Vets({ clinics: serverClinics }: { clinics?: ClinicSummary[] }) {
  const { clinics: storeClinics, callClinic, directionsClinic } = useStore()
  const clinics = serverClinics
    ? serverClinics.map((clinic, index) => mapClinicSummaryToClinic(clinic, index))
    : storeClinics

  return (
    <div style={{ padding: '14px 20px 110px' }}>
      <h1 style={{ fontSize: 25, fontWeight: 700, color: colors.ink, letterSpacing: '-0.02em', margin: '6px 0 4px' }}>
        Vet clinics
      </h1>
      <p style={{ fontSize: 13.5, color: colors.textSecondary, margin: '0 0 22px' }}>
        For cats &amp; birds in Greater Malé.
      </p>

      {clinics.map((clinic) => (
        <div key={clinic.name} style={{ background: '#fff', borderRadius: 20, boxShadow: shadow.card, padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: clinic.tint, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round">
                <line x1="12" y1="6" x2="12" y2="18" />
                <line x1="6" y1="12" x2="18" y2="12" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: colors.ink }}>{clinic.name}</div>
              <div style={{ fontSize: 12.5, color: colors.textSecondaryAlt, marginTop: 2 }}>{clinic.area}</div>
            </div>
          </div>
          <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5, margin: '0 0 13px' }}>{clinic.note}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {clinic.services.map((service) => (
              <span key={service} style={{ background: colors.paper, color: '#6b7280', fontSize: 11.5, fontWeight: 600, padding: '4px 9px', borderRadius: 7 }}>
                {service}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 9 }}>
            <button
              onClick={() => callClinic(clinic.name)}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px 0', borderRadius: 12, border: 'none', background: colors.deepBlue, color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.8a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
              </svg>
              Call
            </button>
            <button
              onClick={directionsClinic}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px 0', borderRadius: 12, border: '1.5px solid #d8dce4', background: '#fff', color: colors.ink, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth="2">
                <path d="M12 22s7-7.6 7-13a7 7 0 1 0-14 0c0 5.4 7 13 7 13z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
              Directions
            </button>
          </div>
        </div>
      ))}

      <div style={{ background: colors.paper, borderRadius: 16, padding: 18 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: colors.textSecondaryAlt, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
          Good to know
        </div>
        <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.55, margin: 0 }}>
          The public clinic in Villimalé closed in 2022. Private neutering runs roughly $71–143 with
          wait times — worth booking early, especially for stray care.
        </p>
      </div>
    </div>
  )
}
