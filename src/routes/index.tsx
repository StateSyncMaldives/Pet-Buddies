import { createFileRoute, redirect } from '@tanstack/react-router'

import { ROUTE_PATHS } from '../router/paths'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: ROUTE_PATHS.browse })
  },
})
