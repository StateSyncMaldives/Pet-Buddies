import { createFileRoute } from '@tanstack/react-router'

import { Vets } from '../screens/Vets'

export const Route = createFileRoute('/vets')({
  loader: async ({ context }) => {
    const result = context.backend.listClinics()
    if (!result.ok) {
      throw new Error(result.error.message)
    }
    return result.data
  },
  component: VetsRoute,
})

function VetsRoute() {
  const data = Route.useLoaderData()
  return <Vets clinics={data.items} />
}
