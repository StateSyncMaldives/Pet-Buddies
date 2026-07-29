import { createServerFn } from '@tanstack/react-start'

import { resolveRequestViewer } from '../../server/auth/request-viewer'
import type { Viewer } from '../../server/auth/resolve-viewer'

/**
 * Who is browsing, for the router context. `__root`'s beforeLoad calls this so
 * every route can read `context.viewer`. The result is UI hinting only — every
 * server function re-resolves and re-authorizes the viewer itself. See ADR 0010.
 */
/**
 * POST, not GET, deliberately — matching every other server function here.
 *
 * A GET response is cacheable, and identity is the one thing that must never
 * be served from a cache: after signing in through Google the SPA re-resolves
 * the viewer, and a stale anonymous GET response left the account menu showing
 * "Sign in" until a manual reload.
 */
export const fetchViewer = createServerFn({ method: 'POST' }).handler(
  async (): Promise<Viewer> => resolveRequestViewer(),
)
