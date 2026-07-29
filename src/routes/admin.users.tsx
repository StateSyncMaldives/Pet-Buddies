import { createFileRoute, redirect } from '@tanstack/react-router'

import { AdminUsers } from '../features/auth/AdminUsers'

export const Route = createFileRoute('/admin/users')({
  /**
   * Keeps non-administrators off the screen.
   *
   * Resolves the viewer through `loadViewer` rather than trusting
   * `context.viewer`, which can still hold the value from before sign-in when
   * the SPA boots from a cached shell — that stale anonymous viewer bounced
   * freshly signed-in administrators to /sign-in. Tests inject `viewer`
   * directly and leave `loadViewer` unset, so they use the context as before.
   *
   * This is a UX guard only. Every action on the screen calls a server
   * function that re-resolves the viewer and re-checks the permission, so
   * reaching this route is never what grants access. See ADR 0010.
   */
  beforeLoad: async ({ context, location }) => {
    const viewer = context.loadViewer ? await context.loadViewer() : context.viewer

    if (viewer.kind !== 'user') {
      throw redirect({ to: '/sign-in', search: { redirect: location.href } })
    }
    if (viewer.role !== 'admin') {
      throw redirect({ to: '/' })
    }

    return { viewer }
  },
  component: AdminUsers,
})
