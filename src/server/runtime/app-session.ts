import type { User } from '../../types'
import { createPrototypeBackend } from './prototype-backend'
import { createInMemoryAsyncBackend, type AsyncAppBackend } from './app-backend'
import { createRuntimeMutationAdapter, type AppMutationAdapter } from '../mutations/mutation-adapter'
import { DEMO_MODERATOR_USER, DEMO_VIEWER_USER } from './demo-identity'

/**
 * The single place demo viewer identity lives. `viewerId`/`moderatorId` are the
 * stable seeded users.id values (not the display name) so durable Viewer-owned
 * writes satisfy the foreign keys. Later tasks replace this with real
 * authenticated session resolution. See ADR 0008.
 */
const DEMO_MOCK_USER: User = { name: DEMO_VIEWER_USER.displayName, email: 'aishath.ali@gmail.com' }
export const DEMO_MODERATOR_ID = DEMO_MODERATOR_USER.id

export interface DemoSession {
  viewerId: string
  mockUser: User
  moderatorId?: string
}

export interface AppRuntime {
  backend: AsyncAppBackend
  mutations: AppMutationAdapter
  session: DemoSession
}

export function createDemoSession(): DemoSession {
  return {
    viewerId: DEMO_VIEWER_USER.id,
    mockUser: DEMO_MOCK_USER,
    moderatorId: DEMO_MODERATOR_ID,
  }
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
