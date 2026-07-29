import { createServerFn } from '@tanstack/react-start'

import { requireGlobalPermission } from '../../server/auth/guards'
import { resolveRequestViewer } from '../../server/auth/request-viewer'
import type { Viewer } from '../../server/auth/resolve-viewer'
import type { ListReviewQueueResponse } from '../../server/contracts/api'
import {
  updateListingLifecycleInputSchema,
  type UpdateListingLifecycleMutationInput,
} from '../../server/mutations/mutation-schemas'
import { createDurableServerMutationAdapter } from '../../server/mutations/durable-mutation-adapter'
import type { AppMutationAdapter } from '../../server/mutations/mutation-adapter'
import type { AsyncAppBackend } from '../../server/runtime/app-backend'
import { createServerBackend } from '../../server/runtime/server-backend'

/**
 * Moderation server functions. The review queue read returns the durably-pending
 * listings a moderator can action; the lifecycle write persists a moderation
 * transition. Both require the global `listing:moderate` permission, checked
 * server-side against the session viewer — any client-side role is only a UI
 * hint. See ADR 0008 / 0009 / 0010.
 */

export async function listReviewQueueForViewer(deps: {
  viewer: Viewer
  backend?: AsyncAppBackend
}): Promise<ListReviewQueueResponse> {
  requireGlobalPermission(deps.viewer, 'listing', 'moderate')

  const backend = deps.backend ?? (await createServerBackend())
  const result = await backend.listReviewQueue()
  if (!result.ok) throw new Error(result.error.message)
  return result.data
}

export async function updateListingLifecycleForViewer(
  deps: { viewer: Viewer; mutations?: AppMutationAdapter },
  input: UpdateListingLifecycleMutationInput,
) {
  requireGlobalPermission(deps.viewer, 'listing', 'moderate')
  // requireGlobalPermission has already narrowed this, but the assertion form
  // does not survive the object destructure.
  if (deps.viewer.kind !== 'user') throw new Error('unreachable')

  const mutations = deps.mutations ?? (await createDurableServerMutationAdapter(deps.viewer))
  // The actor is always the session viewer, never the client-supplied id.
  return mutations.updateListingLifecycle({ ...input, actorUserId: deps.viewer.id })
}

export const fetchReviewQueue = createServerFn({ method: 'POST' }).handler(
  async (): Promise<ListReviewQueueResponse> =>
    listReviewQueueForViewer({ viewer: await resolveRequestViewer() }),
)

export const updateListingLifecycle = createServerFn({ method: 'POST' })
  .validator(updateListingLifecycleInputSchema)
  .handler(async ({ data }) =>
    updateListingLifecycleForViewer({ viewer: await resolveRequestViewer() }, data),
  )
