import { useState } from 'react'
import { Link, useNavigate, useRouteContext, useRouterState } from '@tanstack/react-router'

import { colors } from '../../theme'
import { authClient } from './auth-client'

/**
 * Shows who is signed in and offers a way out; offers a way in when nobody is.
 *
 * Identity comes from the router context viewer, which `__root` resolved from
 * the session cookie server-side — so the first paint is already correct and
 * there is no signed-out flash. This is display only; authorization is decided
 * server-side on every request. See ADR 0010.
 */
export function AccountMenu() {
  const { viewer } = useRouteContext({ from: '__root__' })
  const navigate = useNavigate()
  const currentPath = useRouterState({ select: (state) => state.location.href })
  const [signingOut, setSigningOut] = useState(false)
  const { data: session } = authClient.useSession()

  /**
   * The live session wins over the router context when it has one.
   *
   * Returning from Google is a client-side boot of an already-cached SPA
   * shell, so `context.viewer` can still be the anonymous value resolved
   * before sign-in — which showed "Sign in" to a user who had just
   * authenticated, until they reloaded. The context is still the first-paint
   * source on a fresh document load, where it is server-resolved and correct.
   */
  const account = session?.user
    ? { displayName: session.user.name, email: session.user.email }
    : viewer.kind === 'user'
      ? { displayName: viewer.displayName, email: viewer.email }
      : null

  if (!account) {
    return (
      <Link
        to="/sign-in"
        search={{ redirect: currentPath }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '9px 16px',
          borderRadius: 11,
          border: `1.5px solid ${colors.line}`,
          background: '#fff',
          fontSize: 13.5,
          fontWeight: 600,
          color: colors.ink,
          textDecoration: 'none',
        }}
      >
        Sign in
      </Link>
    )
  }

  const signOut = async () => {
    setSigningOut(true)
    try {
      await authClient.signOut()
      // A document navigation, so the cleared cookie is reflected by the root
      // beforeLoad rather than leaving a stale viewer in context.
      await navigate({ to: '/', reloadDocument: true })
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: colors.ink }}>{account.displayName}</div>
        <div style={{ fontSize: 12, color: colors.textSecondary }}>{account.email}</div>
      </div>
      <button
        type="button"
        onClick={signOut}
        disabled={signingOut}
        style={{
          padding: '9px 14px',
          borderRadius: 11,
          border: `1.5px solid ${colors.line}`,
          background: '#fff',
          fontSize: 13.5,
          fontWeight: 600,
          color: colors.ink,
          cursor: signingOut ? 'progress' : 'pointer',
        }}
      >
        Sign out
      </button>
    </div>
  )
}
