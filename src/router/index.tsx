import { useEffect } from 'react'
import {
  RouterProvider,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  createBrowserHistory,
  createMemoryHistory,
  notFound,
  redirect,
} from '@tanstack/react-router'

import { App } from '../App'
import { Browse } from '../screens/Browse'
import { Report } from '../screens/Report'
import { Vets } from '../screens/Vets'
import { Inbox } from '../screens/Inbox'
import { Saved } from '../screens/Saved'
import type { PrototypeBackend } from '../server/runtime/prototype-backend'
import { useStore } from '../store/store'
import { DETAIL_ROUTE_PATH, ROUTE_PATHS } from './paths'

export interface AppRouterContext {
  backend: PrototypeBackend
  viewerId: string
}

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

const rootRoute = createRootRouteWithContext<AppRouterContext>()({
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

/**
 * Syncs the store's detail overlay from the route's listingId param. The
 * loader has already validated the listing exists before this component
 * mounts; the store remains the render source for mutable listing state
 * (saved flags, status) shown inside the overlay.
 */
function BrowseDetailRoute() {
  const { listingId } = browseDetailRoute.useParams()
  const { openDetail, closeDetail } = useStore()

  // `openDetail`/`closeDetail` are recreated every time any store state
  // changes (the store object itself is rebuilt on each update), so they
  // are not stable dependencies. Only `listingId` should retrigger the
  // open; the close is scoped to this component's actual unmount.
  useEffect(() => {
    openDetail(listingId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId])

  useEffect(() => {
    return () => closeDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <Browse />
}

const browseDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: DETAIL_ROUTE_PATH,
  loader: ({ context, params }) => {
    const result = context.backend.getListingDetail({ slugOrId: params.listingId })
    if (!result.ok) throw notFound()
    return result.data.item
  },
  component: BrowseDetailRoute,
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

export function createAppRouter({
  context,
  initialEntries,
}: {
  context: AppRouterContext
  initialEntries?: string[]
}) {
  return createRouter({
    routeTree,
    context,
    history: initialEntries ? createMemoryHistory({ initialEntries }) : createBrowserHistory(),
    defaultPreload: 'intent',
  })
}

export function AppRouterProvider({ backend, viewerId }: AppRouterContext) {
  const router = createAppRouter({ context: { backend, viewerId } })
  return <RouterProvider router={router} />
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
