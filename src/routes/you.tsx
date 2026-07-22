import { createFileRoute } from '@tanstack/react-router'

import { validateYouSearch } from '../router/you-search'
import { Inbox } from '../features/profile/Inbox'
import { fetchYouReadModel } from '../features/profile/profile.functions'

export const Route = createFileRoute('/you')({
  validateSearch: validateYouSearch,
  loader: async ({ context }) => {
    const result = context.backend
      ? await context.backend.getYouReadModel({ viewerId: context.viewerId })
      : { ok: true as const, data: await fetchYouReadModel() }
    if (!result.ok) {
      throw new Error(result.error.message)
    }
    return result.data
  },
  component: YouRoute,
})

function YouRoute() {
  const search = Route.useSearch()
  const data = Route.useLoaderData()
  return <Inbox view={search.view} youReadModel={data} />
}
