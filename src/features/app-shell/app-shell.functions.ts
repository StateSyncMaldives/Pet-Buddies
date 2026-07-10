import { createServerFn } from '@tanstack/react-start'

import { createDemoSession } from '../../server/runtime/app-session'
import { createServerBackend } from '../../server/runtime/server-backend'
import type { HydratedAppShell } from '../../server/runtime/prototype-backend'

/**
 * Durable app-shell read. The client store first paints from the static seed
 * (deterministic, SSR-safe) and then reconciles against this, which resolves the
 * durable backend on the server and returns the viewer's listings (across every
 * status) and clinics. This is what keeps the store from drifting away from the
 * durable data the route loaders read. See ADR 0008 / #8.
 */
export const fetchAppShell = createServerFn({ method: 'GET' }).handler(async (): Promise<HydratedAppShell> => {
  const backend = await createServerBackend()
  return backend.hydrateAppShell({ viewerId: createDemoSession().viewerId })
})
