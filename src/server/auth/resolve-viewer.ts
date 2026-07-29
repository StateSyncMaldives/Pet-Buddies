import type { GlobalRole } from '../contracts/api'
import type { createAuth } from './auth'

type Auth = ReturnType<typeof createAuth>

/**
 * Who is making the current request. This is the single identity seam the app
 * reads — server functions, the mutation adapter and the router context all
 * consume a `Viewer` rather than talking to Better Auth directly, so the auth
 * provider stays swappable. Replaces the demo-session seam of ADR 0008.
 */
export type Viewer =
  | { kind: 'anonymous' }
  | {
      kind: 'user'
      id: string
      email: string
      displayName: string
      role: GlobalRole
      banned: boolean
    }

export const ANONYMOUS: Viewer = { kind: 'anonymous' }

/** Reads the Better Auth session cookie off the request headers. */
export async function resolveViewer(deps: { auth: Auth; headers: Headers }): Promise<Viewer> {
  const session = await deps.auth.api
    .getSession({ headers: deps.headers })
    .catch(() => null)
  if (!session?.user) return ANONYMOUS

  const user = session.user as {
    id: string
    email: string
    name: string
    role?: string | null
    banned?: boolean | null
  }

  return {
    kind: 'user',
    id: user.id,
    email: user.email,
    displayName: user.name,
    role: (user.role as GlobalRole | null) ?? 'user',
    banned: Boolean(user.banned),
  }
}

export function isSignedIn(viewer: Viewer): viewer is Extract<Viewer, { kind: 'user' }> {
  return viewer.kind === 'user'
}

/** Signed in and not banned — the precondition for every write. */
export function canWrite(viewer: Viewer): boolean {
  return viewer.kind === 'user' && !viewer.banned
}
