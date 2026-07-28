import { createFileRoute, redirect } from '@tanstack/react-router'

import { AdminUsers } from '../features/auth/AdminUsers'

export const Route = createFileRoute('/admin/users')({
  /**
   * Keeps non-administrators off the screen. This is a UX guard only — the
   * screen's every action calls a server function that re-checks the
   * permission, so nothing here is what actually protects the data.
   * See ADR 0010.
   */
  beforeLoad: ({ context, location }) => {
    if (context.viewer.kind !== 'user') {
      throw redirect({ to: '/sign-in', search: { redirect: location.href } })
    }
    if (context.viewer.role !== 'admin') {
      throw redirect({ to: '/' })
    }
  },
  component: AdminUsers,
})
