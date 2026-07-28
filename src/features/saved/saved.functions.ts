import { createServerFn } from '@tanstack/react-start'

import { resolveRequestViewer } from '../../server/auth/request-viewer'
import type { Viewer } from '../../server/auth/resolve-viewer'
import type { ListSavedListingsResponse } from '../../server/contracts/api'
import { toggleSavedListingInputSchema } from '../../server/mutations/mutation-schemas'
import { createDurableServerMutationAdapter } from '../../server/mutations/durable-mutation-adapter'
import type { AsyncAppBackend } from '../../server/runtime/app-backend'
import { createServerBackend } from '../../server/runtime/server-backend'

/**
 * Saved-listings server functions. The SPA loader reads saved listings through
 * fetchSavedListings; the client write routes through toggleSavedListing so it
 * lands on the durable backend. See ADR 0008 / 0010.
 *
 * Each server function is a thin wrapper over an exported handler that takes
 * its viewer and backend explicitly — the handler is what the authorization
 * tests drive, since server functions themselves only execute inside the Start
 * server runtime.
 */

export async function listSavedListingsForViewer(deps: {
  viewer: Viewer
  backend?: AsyncAppBackend
}): Promise<ListSavedListingsResponse> {
  // Nobody signed in means nothing saved. This is a read, so it answers empty
  // rather than refusing — and never touches D1.
  if (deps.viewer.kind !== 'user') return { items: [] }

  const backend = deps.backend ?? (await createServerBackend())
  const result = await backend.listSavedListings({ viewerId: deps.viewer.id })
  if (!result.ok) throw new Error(result.error.message)
  return result.data
}

export const fetchSavedListings = createServerFn({ method: 'POST' }).handler(
  async (): Promise<ListSavedListingsResponse> =>
    listSavedListingsForViewer({ viewer: await resolveRequestViewer() }),
)

export const toggleSavedListing = createServerFn({ method: 'POST' })
  .validator(toggleSavedListingInputSchema)
  .handler(async ({ data }) => {
    return (await createDurableServerMutationAdapter()).toggleSavedListing(data)
  })
