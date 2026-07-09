import type { User } from '../types'
import type { AsyncAppBackend } from '../server/runtime/app-backend'
import type { AppMutationAdapter } from '../server/mutations/mutation-adapter'

export interface AppRouterContext {
  /** Read backend for loaders. Durable (D1) on the server, in-memory on the client. */
  backend: AsyncAppBackend
  /**
   * Write seam for the store. In the running client it calls Start server
   * functions (durable); in tests it is an in-memory adapter over the shared
   * backend. See ADR 0008.
   */
  mutations: AppMutationAdapter
  viewerId: string
  mockUser: User
  moderatorId?: string
}
