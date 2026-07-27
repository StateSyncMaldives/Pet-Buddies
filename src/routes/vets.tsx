import { createFileRoute } from '@tanstack/react-router'

import { Vets } from '../features/clinics/Vets'
import { clinicsQuery } from '../query/queries'

export const Route = createFileRoute('/vets')({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(clinicsQuery(context.backend))
  },
  component: VetsRoute,
})

function VetsRoute() {
  return <Vets />
}
