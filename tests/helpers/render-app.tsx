import { render } from '@testing-library/react'
import { RouterProvider } from '@tanstack/react-router'

import { createAppRouter } from '../../src/router'
import { createAppRuntime } from '../../src/server/runtime/app-session'

/** Renders the full app at a path with a fresh demo runtime: the shared
 * harness for shell/layout behavior tests. Pair with tests/helpers/viewport
 * to drive phone/column/desktop modes. */
export function renderAppAt(
  path: string,
  options: {
    flags?: { onboarded: boolean; installed: boolean; installDismissed: boolean }
    setupRuntime?: (runtime: ReturnType<typeof createAppRuntime>) => void
  } = {},
) {
  const { flags = { onboarded: true, installed: true, installDismissed: true }, setupRuntime } = options
  window.localStorage.setItem('petbuddies.flags', JSON.stringify(flags))

  const runtime = createAppRuntime()
  setupRuntime?.(runtime)
  const { backend, mutations, session } = runtime
  const router = createAppRouter({
    context: {
      backend,
      mutations,
      viewerId: session.viewerId,
      mockUser: session.mockUser,
      moderatorId: session.moderatorId,
    },
    initialEntries: [path],
  })

  render(<RouterProvider router={router} />)
  return router
}
