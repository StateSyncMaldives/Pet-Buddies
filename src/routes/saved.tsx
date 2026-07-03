import { createFileRoute } from '@tanstack/react-router'

import { Saved } from '../screens/Saved'

export const Route = createFileRoute('/saved')({
  component: Saved,
})
