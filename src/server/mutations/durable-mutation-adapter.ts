import { createRuntimeMutationAdapter } from './mutation-adapter'
import { createDemoSession, DEMO_MODERATOR_ID } from '../runtime/demo-session'
import { createServerBackend } from '../runtime/server-backend'

/**
 * Server-side mutation adapter over the durable D1 backend. Shared by the
 * feature server functions that expose writes to the SPA client. See ADR 0008.
 */
export async function createDurableServerMutationAdapter() {
  const backend = await createServerBackend()
  const session = createDemoSession()
  return createRuntimeMutationAdapter({
    backend,
    viewerId: session.viewerId,
    moderatorId: session.moderatorId ?? DEMO_MODERATOR_ID,
  })
}
