import { createServerFn } from '@tanstack/react-start'

import { requireViewer } from '../../server/auth/guards'
import { resolveRequestViewer } from '../../server/auth/request-viewer'
import type { Viewer } from '../../server/auth/resolve-viewer'
import {
  createInquiryInputSchema,
  type CreateInquiryMutationInput,
} from '../../server/mutations/mutation-schemas'
import { createDurableServerMutationAdapter } from '../../server/mutations/durable-mutation-adapter'
import type { AppMutationAdapter } from '../../server/mutations/mutation-adapter'

/**
 * Adoption-inquiry write server function. Client submissions route through this
 * so they persist to the durable backend. Sending an inquiry requires a
 * signed-in viewer — the inquiry is attributed to them. See ADR 0008 / 0010.
 */

export async function createInquiryForViewer(
  deps: { viewer: Viewer; mutations?: AppMutationAdapter },
  input: CreateInquiryMutationInput,
) {
  requireViewer(deps.viewer)

  const mutations = deps.mutations ?? (await createDurableServerMutationAdapter(deps.viewer))
  return mutations.createInquiry(input)
}

export const createInquiry = createServerFn({ method: 'POST' })
  .validator(createInquiryInputSchema)
  .handler(async ({ data }) => createInquiryForViewer({ viewer: await resolveRequestViewer() }, data))
