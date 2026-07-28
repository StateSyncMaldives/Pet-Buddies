import { createPrototypeBackend } from './prototype-backend'
import { createInMemoryAsyncBackend, type AsyncAppBackend } from './app-backend'
import { createRuntimeMutationAdapter, type AppMutationAdapter } from '../mutations/mutation-adapter'
import { createDemoSession, type DemoSession } from './demo-session'

export { createDemoSession, DEMO_MODERATOR_ID, type DemoSession } from './demo-session'

/**
 * The single place demo viewer identity lives. `viewerId`/`moderatorId` are the
 * stable seeded users.id values (not the display name) so durable Viewer-owned
 * writes satisfy the foreign keys. Later tasks replace this with real
 * authenticated session resolution. See ADR 0008.
 */
export interface AppRuntime {
  backend: AsyncAppBackend
  mutations: AppMutationAdapter
  session: DemoSession
}

/**
 * Composes a fresh backend instance with a demo session. One runtime should
 * be created per app mount (or, later, per request) — never cached at module
 * scope.
 */
export function createAppRuntime(): AppRuntime {
  const session = createDemoSession()
  const backend = createInMemoryAsyncBackend(createPrototypeBackend())
  const mutations = createRuntimeMutationAdapter({
    backend,
    viewerId: session.viewerId,
    moderatorId: session.moderatorId,
  })
  return { backend, mutations, session }
}
