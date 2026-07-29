import { createServerFn } from '@tanstack/react-start'

import { resolveRequestViewer } from '../../server/auth/request-viewer'
import type { Viewer } from '../../server/auth/resolve-viewer'
import type { AsyncAppBackend, HydratedAppShell } from '../../server/runtime/app-backend'
import { createServerBackend } from '../../server/runtime/server-backend'

/**
 * Durable app-shell read. This resolves the D1-backed backend on the server and
 * returns the viewer's listings (across every status) and clinics. This is what
 * keeps the store from drifting away from the durable data the route loaders
 * read. See ADR 0008 / 0010 / #8.
 *
 * Anonymous visitors still get the public shell — the viewer id only decides
 * which listings come back marked as saved.
 */

export async function hydrateAppShellForViewer(deps: {
  viewer: Viewer
  backend?: AsyncAppBackend
}): Promise<HydratedAppShell> {
  const backend = deps.backend ?? (await createServerBackend())
  return backend.hydrateAppShell({
    viewerId: deps.viewer.kind === 'user' ? deps.viewer.id : undefined,
  })
}

export const fetchAppShell = createServerFn({ method: 'POST' }).handler(
  async (): Promise<HydratedAppShell> =>
    hydrateAppShellForViewer({ viewer: await resolveRequestViewer() }),
)
