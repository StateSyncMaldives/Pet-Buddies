import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Screen } from '../../layout/primitives'
import {
  adminModerationEventsQuery,
  adminOrganizationsQuery,
  adminUsersQuery,
  queryKeys,
} from '../../query/queries'
import type { GlobalRole } from '../../server/contracts/api'
import { colors, shadow } from '../../theme'
import { banUser, setUserRole, unbanUser, unverifyOrganization, verifyOrganization } from './admin.functions'

const ROLES: GlobalRole[] = ['user', 'moderator', 'admin']

function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }
  return 'Something went wrong. Please try again.'
}

const cellStyle = { padding: '10px 8px', fontSize: 13.5, color: colors.ink, textAlign: 'left' } as const

function actionChip(action: string) {
  switch (action) {
    case 'approved':
      return { color: colors.adoptedText, bg: colors.adoptedBg }
    case 'rejected':
      return { color: colors.rejectText, bg: colors.rejectBg }
    case 'adopted':
      return { color: colors.liveText, bg: colors.liveBg }
    default:
      return { color: colors.pendingText, bg: colors.pendingBg }
  }
}

/** Stored as an ISO/SQL timestamp; shown in the reader's own locale. */
function formatWhen(value: string): string {
  const parsed = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString()
}

/**
 * Administrator user management. Every control here calls a server function
 * that re-checks the permission — the screen being reachable is never what
 * authorizes the action. See ADR 0010.
 */
export function AdminUsers() {
  const queryClient = useQueryClient()
  const users = useQuery(adminUsersQuery())
  const organizations = useQuery(adminOrganizationsQuery())
  const auditLog = useQuery(adminModerationEventsQuery())

  const roleMutation = useMutation({
    mutationFn: (input: { userId: string; role: GlobalRole }) => setUserRole({ data: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers }),
  })

  const banMutation = useMutation({
    mutationFn: (input: { userId: string; banned: boolean }) =>
      input.banned
        ? unbanUser({ data: { userId: input.userId } })
        : banUser({ data: { userId: input.userId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers }),
  })

  const verificationMutation = useMutation({
    mutationFn: (input: { organizationId: string; verified: boolean }) =>
      input.verified
        ? unverifyOrganization({ data: { organizationId: input.organizationId } })
        : verifyOrganization({ data: { organizationId: input.organizationId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.adminOrganizations }),
  })

  const failure = roleMutation.error ?? banMutation.error ?? verificationMutation.error

  return (
    <Screen title="User management" maxWidth={880}>
      {failure && (
        <p
          role="alert"
          style={{
            margin: '0 0 16px',
            padding: '11px 14px',
            borderRadius: 12,
            background: colors.rejectBg,
            color: colors.rejectText,
            fontSize: 13.5,
          }}
        >
          {errorMessage(failure)}
        </p>
      )}

      <section style={{ background: '#fff', borderRadius: 16, boxShadow: shadow.cardSm, padding: 14 }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: colors.ink }}>People</h2>

        {users.isPending ? (
          <p style={{ fontSize: 13.5, color: colors.textSecondary }}>Loading people…</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th scope="col" style={{ ...cellStyle, color: colors.textSecondary }}>
                  Person
                </th>
                <th scope="col" style={{ ...cellStyle, color: colors.textSecondary }}>
                  Role
                </th>
                <th scope="col" style={{ ...cellStyle, color: colors.textSecondary }}>
                  Access
                </th>
              </tr>
            </thead>
            <tbody>
              {(users.data?.items ?? []).map((user) => (
                <tr key={user.id} style={{ borderTop: `1px solid ${colors.lineAlt}` }}>
                  <td style={cellStyle}>
                    <div style={{ fontWeight: 600 }}>{user.displayName}</div>
                    <div style={{ fontSize: 12, color: colors.textSecondary }}>{user.email}</div>
                  </td>
                  <td style={cellStyle}>
                    <label>
                      <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
                        Role for {user.displayName}
                      </span>
                      <select
                        value={user.role}
                        disabled={roleMutation.isPending}
                        onChange={(event) =>
                          roleMutation.mutate({
                            userId: user.id,
                            role: event.target.value as GlobalRole,
                          })
                        }
                        style={{
                          padding: '7px 10px',
                          borderRadius: 10,
                          border: `1.5px solid ${colors.line}`,
                          background: '#fff',
                          fontSize: 13,
                        }}
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </label>
                  </td>
                  <td style={cellStyle}>
                    <button
                      type="button"
                      disabled={banMutation.isPending}
                      onClick={() => banMutation.mutate({ userId: user.id, banned: user.banned })}
                      style={{
                        padding: '7px 12px',
                        borderRadius: 10,
                        border: `1.5px solid ${colors.line}`,
                        background: '#fff',
                        fontSize: 13,
                        fontWeight: 600,
                        color: user.banned ? colors.adoptedText : colors.rejectText,
                        cursor: 'pointer',
                      }}
                    >
                      {user.banned ? `Unban ${user.displayName}` : `Ban ${user.displayName}`}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section
        style={{
          background: '#fff',
          borderRadius: 16,
          boxShadow: shadow.cardSm,
          padding: 14,
          marginTop: 18,
        }}
      >
        <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: colors.ink }}>
          Organizations
        </h2>

        {organizations.isPending ? (
          <p style={{ fontSize: 13.5, color: colors.textSecondary }}>Loading organizations…</p>
        ) : (
          (organizations.data?.items ?? []).map((organization) => (
            <div
              key={organization.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '10px 0',
                borderTop: `1px solid ${colors.lineAlt}`,
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: colors.ink }}>{organization.name}</div>
                <div style={{ fontSize: 12, color: colors.textSecondary }}>
                  {organization.isVerified ? 'Verified' : 'Not verified'}
                </div>
              </div>
              <button
                type="button"
                disabled={verificationMutation.isPending}
                onClick={() =>
                  verificationMutation.mutate({
                    organizationId: organization.id,
                    verified: organization.isVerified,
                  })
                }
                style={{
                  padding: '7px 12px',
                  borderRadius: 10,
                  border: `1.5px solid ${colors.line}`,
                  background: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  color: colors.ink,
                  cursor: 'pointer',
                }}
              >
                {organization.isVerified ? `Unverify ${organization.name}` : `Verify ${organization.name}`}
              </button>
            </div>
          ))
        )}
      </section>

      <section
        style={{
          background: '#fff',
          borderRadius: 16,
          boxShadow: shadow.cardSm,
          padding: 14,
          marginTop: 18,
        }}
      >
        <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: colors.ink }}>
          Moderation audit log
        </h2>
        <p style={{ margin: '0 0 12px', fontSize: 12.5, color: colors.textSecondary }}>
          Every listing decision, newest first. Entries are immutable — they are never edited or
          removed, so this is the record of who did what.
        </p>

        {auditLog.isPending ? (
          <p style={{ fontSize: 13.5, color: colors.textSecondary }}>Loading activity…</p>
        ) : (auditLog.data?.items ?? []).length === 0 ? (
          <p style={{ fontSize: 13.5, color: colors.textSecondary }}>
            No moderation activity yet. Approving or rejecting a listing from the review queue will
            record an entry here.
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['When', 'Action', 'Listing', 'By', 'Reason'].map((heading) => (
                  <th key={heading} scope="col" style={{ ...cellStyle, color: colors.textSecondary }}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(auditLog.data?.items ?? []).map((entry) => {
                const chip = actionChip(entry.action)
                return (
                  <tr key={entry.id} style={{ borderTop: `1px solid ${colors.lineAlt}` }}>
                    <td style={{ ...cellStyle, whiteSpace: 'nowrap', color: colors.textSecondary }}>
                      {formatWhen(entry.createdAt)}
                    </td>
                    <td style={cellStyle}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: chip.color,
                          background: chip.bg,
                          padding: '3px 9px',
                          borderRadius: 7,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {entry.action}
                      </span>
                    </td>
                    <td style={cellStyle}>{entry.listingName ?? entry.listingId}</td>
                    <td style={cellStyle}>
                      {entry.actorDisplayName ?? entry.actorEmail ?? 'Unknown'}
                    </td>
                    <td style={{ ...cellStyle, color: colors.textSecondary }}>{entry.reason ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>
    </Screen>
  )
}
