import { createServerFn } from '@tanstack/react-start'

import type { HydratedAppShell } from '../../server/runtime/app-backend'
import { createDemoSession } from '../../server/runtime/demo-session'
import { createServerBackend } from '../../server/runtime/server-backend'

/**
 * Durable app-shell read. This resolves the D1-backed backend on the server and
 * returns the viewer's listings (across every status) and clinics. This is what
 * keeps the store from drifting away from the durable data the route loaders
 * read. See ADR 0008 / #8.
 */
export const fetchAppShell = createServerFn({ method: 'POST' }).handler(async (): Promise<HydratedAppShell> => {
  const backend = await createServerBackend()
  return backend.hydrateAppShell({ viewerId: createDemoSession().viewerId })
})
