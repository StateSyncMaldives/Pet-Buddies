import { Outlet, createFileRoute } from '@tanstack/react-router'

import { Browse } from '../screens/Browse'
import { validateBrowseSearch } from '../router/browse-search'

export const Route = createFileRoute('/browse')({
  validateSearch: validateBrowseSearch,
  component: BrowseRoute,
})

function BrowseRoute() {
  const search = Route.useSearch()
  return (
    <>
      <Browse search={search} />
      <Outlet />
    </>
  )
}
