import { createFileRoute } from '@tanstack/react-router'

import { Saved } from '../features/saved/Saved'
import { savedListingsQuery } from '../query/queries'

export const Route = createFileRoute('/saved')({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(savedListingsQuery(context.backend, context.viewerId))
  },
  component: SavedRoute,
})

function SavedRoute() {
  return <Saved />
}
