import { createServerFn } from '@tanstack/react-start'

import type { ListReviewQueueResponse } from '../../server/contracts/api'
import { updateListingLifecycleInputSchema } from '../../server/mutations/mutation-schemas'
import { createDurableServerMutationAdapter } from '../../server/mutations/durable-mutation-adapter'
import { createServerBackend } from '../../server/runtime/server-backend'

/**
 * Moderation server functions. The review queue read returns the durably-pending
 * listings a moderator can action; the lifecycle write persists a moderation
 * transition. Both resolve the durable backend server-side. See ADR 0008 / 0009.
 */

export const fetchReviewQueue = createServerFn({ method: 'POST' }).handler(
  async (): Promise<ListReviewQueueResponse> => {
    const backend = await createServerBackend()
    const result = await backend.listReviewQueue()
    if (!result.ok) throw new Error(result.error.message)
    return result.data
  },
)

export const updateListingLifecycle = createServerFn({ method: 'POST' })
  .validator(updateListingLifecycleInputSchema)
  .handler(async ({ data }) => {
    return (await createDurableServerMutationAdapter()).updateListingLifecycle(data)
  })
