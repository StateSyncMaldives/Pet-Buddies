import {
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  createBrowserHistory,
  createMemoryHistory,
  redirect,
} from '@tanstack/react-router'

import { App } from '../App'
import { Browse } from '../screens/Browse'
import { Report } from '../screens/Report'
import { Vets } from '../screens/Vets'
import { Inbox } from '../screens/Inbox'
import { Saved } from '../screens/Saved'
import { DETAIL_ROUTE_PATH, ROUTE_PATHS } from './paths'

function DefaultNotFound() {
  return (
    <section style={{ padding: '40px 24px 140px' }}>
      <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>Page not found</h1>
      <p style={{ marginTop: 10, color: '#6b7280', lineHeight: 1.6 }}>
        This page doesn&apos;t exist yet. Try heading back to Browse.
      </p>
    </section>
  )
}

const rootRoute = createRootRoute({
  component: App,
  notFoundComponent: DefaultNotFound,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: ROUTE_PATHS.browse })
  },
})

const browseRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'browse',
  component: Browse,
})

const browseDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: DETAIL_ROUTE_PATH,
  component: Browse,
})

const reportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'report',
  component: Report,
})

const vetsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'vets',
  component: Vets,
})

const youRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'you',
  component: Inbox,
})

const savedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'saved',
  component: Saved,
})

const routeTree = rootRoute.addChildren([indexRoute, browseRoute, browseDetailRoute, reportRoute, vetsRoute, youRoute, savedRoute])

export function createAppRouter({ initialEntries }: { initialEntries?: string[] } = {}) {
  return createRouter({
    routeTree,
    history: initialEntries ? createMemoryHistory({ initialEntries }) : createBrowserHistory(),
    defaultPreload: 'intent',
  })
}

export function AppRouterProvider() {
  const router = createAppRouter()
  return <RouterProvider router={router} />
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
