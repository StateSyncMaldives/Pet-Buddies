import type { User } from '../types'
import type { PrototypeBackend } from '../server/runtime/prototype-backend'

export interface AppRouterContext {
  backend: PrototypeBackend
  viewerId: string
  mockUser: User
  moderatorId?: string
}
