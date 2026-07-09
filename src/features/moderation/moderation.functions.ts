import { createServerFn } from '@tanstack/react-start'

import { updateListingLifecycleInputSchema } from '../../server/mutations/mutation-schemas'
import { createDurableServerMutationAdapter } from '../../server/mutations/durable-mutation-adapter'

/**
 * Moderation write server function. Moderator lifecycle transitions route
 * through this so they persist to the durable backend. See ADR 0008.
 */

export const updateListingLifecycle = createServerFn({ method: 'POST' })
  .validator(updateListingLifecycleInputSchema)
  .handler(async ({ data }) => {
    return (await createDurableServerMutationAdapter()).updateListingLifecycle(data)
  })
