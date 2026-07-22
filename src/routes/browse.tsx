import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'

import { Browse } from '../features/listings/Browse'
import { getBrowseListings } from '../features/listings/listings.functions'
import { useViewportMode } from '../layout/viewport-mode'
import { isDetailPath } from '../router/paths'
import { toTagSlug, validateBrowseSearch } from '../router/browse-search'

export const Route = createFileRoute('/browse')({
  validateSearch: validateBrowseSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    const query = {
      species: deps.species,
      search: deps.query || undefined,
      tagSlugs: deps.tags.map(toTagSlug),
    }
    const result = context.backend
      ? await context.backend.browseListings({ query })
      : {
          ok: true as const,
          data: await getBrowseListings({
            data: {
              species: deps.species,
              query: deps.query,
              tags: deps.tags,
            },
          }),
        }

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return result.data
  },
  component: BrowseRoute,
})

function BrowseRoute() {
  const search = Route.useSearch()
  const browseData = Route.useLoaderData()
  const desktop = useViewportMode() === 'desktop'
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  // Desktop renders listing detail as a page of its own; phone/column keep the
  // feed mounted underneath the detail overlay.
  if (desktop && isDetailPath(pathname)) {
    return <Outlet />
  }

  return (
    <>
      <Browse search={search} serverListings={browseData.items} />
      <Outlet />
    </>
  )
}
