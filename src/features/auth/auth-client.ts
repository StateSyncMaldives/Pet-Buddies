import { adminClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

/**
 * The browser-side Better Auth client. It talks to the same origin's
 * `/api/auth/*` handler, so no base URL is needed — `VITE_BETTER_AUTH_URL` is
 * only for setups that serve the API from a different origin.
 *
 * Session cookies are httpOnly and set by the server; nothing here stores a
 * token. Anything this client reports about roles is UI hinting only — every
 * server function re-checks authorization. See ADR 0010.
 */
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BETTER_AUTH_URL || undefined,
  plugins: [adminClient()],
})

export const { signIn, signUp, signOut, useSession } = authClient
