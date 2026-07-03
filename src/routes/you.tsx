import { createFileRoute } from '@tanstack/react-router'

import { Inbox } from '../screens/Inbox'

export const Route = createFileRoute('/you')({
  component: Inbox,
})
