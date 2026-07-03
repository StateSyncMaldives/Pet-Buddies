import {
  RouterProvider,
  createBrowserHistory,
  createMemoryHistory,
  createRouter,
} from '@tanstack/react-router'

import { routeTree } from '../routeTree.gen'
import { createAppRuntime } from '../server/runtime/app-session'
import type { AppRouterContext } from './context'

export type { AppRouterContext } from './context'

function createDefaultRouterContext(): AppRouterContext {
  const { backend, session } = createAppRuntime()
  return {
    backend,
    viewerId: session.viewerId,
    mockUser: session.mockUser,
    moderatorId: session.moderatorId,
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
