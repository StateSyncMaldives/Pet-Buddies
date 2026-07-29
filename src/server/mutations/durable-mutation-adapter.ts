import { createRuntimeMutationAdapter } from './mutation-adapter'
import { AuthzError } from '../auth/authz-error'
import { resolveRequestViewer } from '../auth/request-viewer'
import { canWrite, isSignedIn, type Viewer } from '../auth/resolve-viewer'
import { createServerBackend } from '../runtime/server-backend'

/**
 * Server-side mutation adapter over the durable D1 backend, bound to the viewer
 * making the request. Shared by the feature server functions that expose writes
 * to the SPA client. See ADR 0008 / 0010.
 *
 * Every write requires a viewer: an anonymous or banned caller is rejected here
 * so no write path can silently fall back to a shared demo identity.
 */
export async function createDurableServerMutationAdapter(viewer?: Viewer) {
  const resolved = viewer ?? (await resolveRequestViewer())

  if (!isSignedIn(resolved)) throw new AuthzError('UNAUTHORIZED', 'Sign in required.')
  if (!canWrite(resolved)) throw new AuthzError('FORBIDDEN', 'Your account is suspended.')

  const backend = await createServerBackend()
  return createRuntimeMutationAdapter({
    backend,
    viewerId: resolved.id,
    // Moderation actions are attributed to the acting viewer. The moderate
    // permission itself is enforced by the moderation server functions (B2).
    moderatorId: resolved.id,
  })
}
