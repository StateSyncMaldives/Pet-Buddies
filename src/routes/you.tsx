import { createFileRoute } from '@tanstack/react-router'

import { validateYouSearch } from '../router/you-search'
import { Inbox } from '../features/profile/Inbox'
import { youReadModelQuery } from '../query/queries'

export const Route = createFileRoute('/you')({
  validateSearch: validateYouSearch,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(youReadModelQuery(context.backend, context.viewerId))
  },
  component: YouRoute,
})

function YouRoute() {
  const search = Route.useSearch()
  return <Inbox view={search.view} />
}
