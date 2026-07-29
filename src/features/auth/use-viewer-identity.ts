import { useRouteContext } from '@tanstack/react-router'

import type { GlobalRole } from '../../server/contracts/api'
import { authClient } from './auth-client'

export interface ViewerIdentity {
  signedIn: boolean
  displayName: string | null
  email: string | null
  role: GlobalRole | null
}

const ANONYMOUS_IDENTITY: ViewerIdentity = {
  signedIn: false,
  displayName: null,
  email: null,
  role: null,
}

/**
 * Who the UI should present as signed in.
 *
 * The live Better Auth session wins over the router context. Returning from
 * Google boots an already-cached SPA shell, so `context.viewer` can still hold
 * the anonymous value resolved before sign-in — which showed "Sign in" to a
 * user who had just authenticated. The context remains the first-paint source
 * on a fresh document load, where it is server-resolved and correct.
 *
 * Display and navigation only. Every server function re-resolves the viewer
 * and re-checks the permission; nothing here grants access. See ADR 0010.
 */
export function useViewerIdentity(): ViewerIdentity {
  const { viewer } = useRouteContext({ from: '__root__' })
  const { data: session } = authClient.useSession()

  const sessionUser = session?.user as
    | { name?: string; email?: string; role?: string | null }
    | undefined

  if (sessionUser?.email) {
    return {
      signedIn: true,
      displayName: sessionUser.name ?? null,
      email: sessionUser.email,
      role: (sessionUser.role as GlobalRole | null) ?? 'user',
    }
  }

  if (viewer.kind === 'user') {
    return {
      signedIn: true,
      displayName: viewer.displayName,
      email: viewer.email,
      role: viewer.role,
    }
  }

  return ANONYMOUS_IDENTITY
}
