import type { QueryClient } from '@tanstack/react-query'

import type { Viewer } from '../server/auth/resolve-viewer'
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
  /**
   * Who is browsing. Populated by `__root`'s beforeLoad from the real session
   * (ADR 0010) and read by route guards and the shell. Client-visible role is
   * UI hinting only — authorization is always re-checked server-side.
   */
  viewer: Viewer
  /**
   * How `__root` resolves the real viewer. The default context points this at
   * the `fetchViewer` server function; tests inject a viewer directly and leave
   * it unset, which keeps the router off the network. See ADR 0010.
   */
  loadViewer?: () => Promise<Viewer>
}
