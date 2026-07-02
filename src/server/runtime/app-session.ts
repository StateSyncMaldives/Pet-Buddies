import type { User } from '../../types'
import { createPrototypeBackend, type PrototypeBackend } from './prototype-backend'

/**
 * The single place demo viewer identity lives. Later tasks will replace this
 * with real authenticated session resolution threaded from the server layer.
 */
const DEMO_MOCK_USER: User = { name: 'Aishath Ali', email: 'aishath.ali@gmail.com' }
const DEMO_MODERATOR_ID = 'moderator-demo'

export interface DemoSession {
  viewerId: string
  mockUser: User
  moderatorId?: string
}

export interface AppRuntime {
  backend: PrototypeBackend
  session: DemoSession
}

export function createDemoSession(): DemoSession {
  return {
    viewerId: DEMO_MOCK_USER.name,
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
  return {
    backend: createPrototypeBackend(),
    session: createDemoSession(),
  }
}
