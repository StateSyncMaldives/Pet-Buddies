import { createFileRoute } from '@tanstack/react-router'

import { Report } from '../features/reports/Report'

export const Route = createFileRoute('/report')({
  component: Report,
})
