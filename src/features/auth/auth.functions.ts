import { createServerFn } from '@tanstack/react-start'

import { resolveRequestViewer } from '../../server/auth/request-viewer'
import type { Viewer } from '../../server/auth/resolve-viewer'

/**
 * Who is browsing, for the router context. `__root`'s beforeLoad calls this so
 * every route can read `context.viewer`. The result is UI hinting only — every
 * server function re-resolves and re-authorizes the viewer itself. See ADR 0010.
 */
export const fetchViewer = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Viewer> => resolveRequestViewer(),
)
