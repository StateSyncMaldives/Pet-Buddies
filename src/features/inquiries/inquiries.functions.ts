import { createServerFn } from '@tanstack/react-start'

import { createInquiryInputSchema } from '../../server/mutations/mutation-schemas'
import { createDurableServerMutationAdapter } from '../../server/mutations/durable-mutation-adapter'

/**
 * Adoption-inquiry write server function. Client submissions route through this
 * so they persist to the durable backend. See ADR 0008.
 */

export const createInquiry = createServerFn({ method: 'POST' })
  .validator(createInquiryInputSchema)
  .handler(async ({ data }) => {
    return (await createDurableServerMutationAdapter()).createInquiry(data)
  })
