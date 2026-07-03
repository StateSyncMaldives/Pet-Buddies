import { Outlet, createFileRoute } from '@tanstack/react-router'

import { Browse } from '../screens/Browse'
import { toTagSlug, validateBrowseSearch } from '../router/browse-search'

export const Route = createFileRoute('/browse')({
  validateSearch: validateBrowseSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    const result = context.backend.browseListings({
      query: {
        species: deps.species,
        search: deps.query || undefined,
        tagSlugs: deps.tags.map(toTagSlug),
      },
    })

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
  return (
    <>
      <Browse search={search} serverListings={browseData.items} />
      <Outlet />
    </>
  )
}
