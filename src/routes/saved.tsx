import { createFileRoute } from '@tanstack/react-router'

import { Saved } from '../features/saved/Saved'
import { fetchSavedListings } from '../features/saved/saved.functions'

export const Route = createFileRoute('/saved')({
  loader: async ({ context }) => {
    const result = context.backend
      ? await context.backend.listSavedListings({ viewerId: context.viewerId })
      : { ok: true as const, data: await fetchSavedListings() }
    if (!result.ok) {
      throw new Error(result.error.message)
    }
    return result.data
  },
  component: SavedRoute,
})

function SavedRoute() {
  const data = Route.useLoaderData()
  return <Saved savedListings={data.items} />
}
