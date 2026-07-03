import { createFileRoute } from '@tanstack/react-router'

import { Vets } from '../screens/Vets'

export const Route = createFileRoute('/vets')({
  component: Vets,
})
