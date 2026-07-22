import { createFileRoute } from '@tanstack/react-router'

import { Vets } from '../features/clinics/Vets'
import { fetchClinics } from '../features/clinics/clinics.functions'

export const Route = createFileRoute('/vets')({
  loader: async ({ context }) => {
    const result = context.backend
      ? await context.backend.listClinics()
      : { ok: true as const, data: await fetchClinics() }
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
