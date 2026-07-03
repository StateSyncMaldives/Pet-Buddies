import { createFileRoute } from '@tanstack/react-router'

import { Report } from '../screens/Report'

export const Route = createFileRoute('/report')({
  component: Report,
})
