import { getRequestHeaders } from '@tanstack/react-start/server'

import { createRequestAuth, type createAuth } from './auth'
import { ANONYMOUS, resolveViewer, type Viewer } from './resolve-viewer'

type Auth = ReturnType<typeof createAuth>

/** Reads the ambient request's headers, or nothing outside a request scope. */
function ambientRequestHeaders(): Headers | null {
  try {
    return getRequestHeaders() as unknown as Headers
  } catch {
    return null
  }
}

/**
 * The viewer for the server function currently executing. Server functions call
 * this with no arguments; `deps` exists so tests can drive the seam directly.
 *
 * A request with no cookie is anonymous without ever building a Better Auth
 * instance — that keeps anonymous reads off the D1 round-trip and lets the
 * seam work in contexts with no Worker bindings at all.
 */
export async function resolveRequestViewer(
  deps: { headers?: Headers; auth?: Auth } = {},
): Promise<Viewer> {
  const headers = deps.headers ?? ambientRequestHeaders()
  if (!headers?.get('cookie')) return ANONYMOUS

  const auth = deps.auth ?? (await createRequestAuth())
  return resolveViewer({ auth, headers })
}
