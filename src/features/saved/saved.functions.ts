import { createServerFn } from '@tanstack/react-start'

import type { ListSavedListingsResponse } from '../../server/contracts/api'
import { toggleSavedListingInputSchema } from '../../server/mutations/mutation-schemas'
import { createDurableServerMutationAdapter } from '../../server/mutations/durable-mutation-adapter'
import { createDemoSession } from '../../server/runtime/app-session'
import { createServerBackend } from '../../server/runtime/server-backend'

/**
 * Saved-listings server functions. The SPA loader reads saved listings through
 * fetchSavedListings; the client write routes through toggleSavedListing so it
 * lands on the durable backend. See ADR 0008.
 */

export const fetchSavedListings = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ListSavedListingsResponse> => {
    const backend = await createServerBackend()
    const result = await backend.listSavedListings({ viewerId: createDemoSession().viewerId })
    if (!result.ok) throw new Error(result.error.message)
    return result.data
  },
)

export const toggleSavedListing = createServerFn({ method: 'POST' })
  .validator(toggleSavedListingInputSchema)
  .handler(async ({ data }) => {
    return (await createDurableServerMutationAdapter()).toggleSavedListing(data)
  })
