import type { QueryClient } from '@tanstack/react-query'

import type { User } from '../types'
import type { AsyncAppBackend } from '../server/runtime/app-backend'
import type { AppMutationAdapter } from '../server/mutations/mutation-adapter'

export interface AppRouterContext {
  /** The single client cache for durable reads (ADR 0009). Loaders prefetch
   * with ensureQueryData; components read with useQuery. */
  queryClient: QueryClient
  /** Test-only read backend injection. Runtime routes use server functions. */
  backend?: AsyncAppBackend
  /**
   * Test-only write seam injection. Runtime store writes use server functions.
   * See ADR 0008.
   */
  mutations?: AppMutationAdapter
  viewerId: string
  mockUser: User
  moderatorId?: string
}
