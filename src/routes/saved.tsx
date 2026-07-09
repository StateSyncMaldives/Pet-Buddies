import { createFileRoute } from '@tanstack/react-router'

import { Saved } from '../screens/Saved'

export const Route = createFileRoute('/saved')({
  loader: async ({ context }) => {
    const result = await context.backend.listSavedListings({ viewerId: context.viewerId })
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
