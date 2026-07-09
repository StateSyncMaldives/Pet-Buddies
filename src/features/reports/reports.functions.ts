import { createServerFn } from '@tanstack/react-start'

import { createReportInputSchema } from '../../server/mutations/mutation-schemas'
import { createDurableServerMutationAdapter } from '../../server/mutations/durable-mutation-adapter'

/**
 * Lost & found report write server function. Client submissions route through
 * this so they persist to the durable backend. See ADR 0008.
 */

export const createReport = createServerFn({ method: 'POST' })
  .validator(createReportInputSchema)
  .handler(async ({ data }) => {
    return (await createDurableServerMutationAdapter()).createReport(data)
  })
