import {
  RouterProvider,
  createBrowserHistory,
  createMemoryHistory,
  createRouter,
} from '@tanstack/react-router'

import { routeTree } from '../routeTree.gen'
import { createQueryClient } from '../query/client'
import { fetchViewer } from '../features/auth/auth.functions'
import { ANONYMOUS } from '../server/auth/resolve-viewer'
import type { AppRouterContext } from './context'

export type { AppRouterContext } from './context'

/**
 * The starting context. `viewer` is anonymous until `__root`'s beforeLoad
 * resolves the real session through `loadViewer` — never assume a signed-in
 * viewer from here.
 */
function createDefaultRouterContext(): AppRouterContext {
  return {
    queryClient: createQueryClient(),
    viewer: ANONYMOUS,
    loadViewer: () => fetchViewer(),
  }
}

export function createAppRouter({
  context = createDefaultRouterContext(),
  initialEntries,
}: {
  context?: AppRouterContext
  initialEntries?: string[]
} = {}) {
  const history =
    initialEntries || typeof window === 'undefined'
      ? createMemoryHistory({ initialEntries: initialEntries ?? ['/'] })
      : createBrowserHistory()

  return createRouter({
    routeTree,
    context,
    history,
    defaultPreload: 'intent',
  })
}

export function getRouter() {
  return createAppRouter()
}

export function AppRouterProvider(context: AppRouterContext) {
  const router = createAppRouter({ context })
  return <RouterProvider router={router} />
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
