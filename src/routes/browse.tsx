import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'

import { Browse } from '../features/listings/Browse'
import { browseQuery } from '../query/queries'
import { useViewportMode } from '../layout/viewport-mode'
import { isDetailPath } from '../router/paths'
import { validateBrowseSearch } from '../router/browse-search'

export const Route = createFileRoute('/browse')({
  validateSearch: validateBrowseSearch,
  loaderDeps: ({ search }) => search,
  // Prefetch the browse read into the query cache (ADR 0009); the component
  // reads it with useQuery keyed on the same input.
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(
      browseQuery(context.backend, { species: deps.species, query: deps.query, tags: deps.tags }),
    )
  },
  component: BrowseRoute,
})

function BrowseRoute() {
  const search = Route.useSearch()
  const desktop = useViewportMode() === 'desktop'
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  // Desktop renders listing detail as a page of its own; phone/column keep the
  // feed mounted underneath the detail overlay.
  if (desktop && isDetailPath(pathname)) {
    return <Outlet />
  }

  return (
    <>
      <Browse search={search} />
      <Outlet />
    </>
  )
}
