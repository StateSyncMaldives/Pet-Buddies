import { render } from '@testing-library/react'
import { RouterProvider } from '@tanstack/react-router'

import { createAppRouter } from '../../src/router'
import { createQueryClient } from '../../src/query/client'
import type { Viewer } from '../../src/server/auth/resolve-viewer'
import { createAppRuntime } from '../../src/server/runtime/app-session'
import { TEST_VIEWER } from './viewers'

/** Renders the full app at a path with a fresh in-memory runtime: the shared
 * harness for shell/layout behavior tests. Pair with tests/helpers/viewport
 * to drive phone/column/desktop modes.
 *
 * The viewer is injected directly, so the router never calls `loadViewer` —
 * no server function, no network. Defaults to a signed-in fixture viewer;
 * pass `viewer: ANONYMOUS` to exercise the signed-out shell. */
export function renderAppAt(
  path: string,
  options: {
    flags?: { onboarded: boolean; installed: boolean; installDismissed: boolean }
    viewer?: Viewer
    /** Mirrors production's fresh-resolve seam; leave unset to use `viewer`. */
    loadViewer?: () => Promise<Viewer>
    setupRuntime?: (runtime: ReturnType<typeof createAppRuntime>) => void
  } = {},
) {
  const {
    flags = { onboarded: true, installed: true, installDismissed: true },
    viewer = TEST_VIEWER,
    loadViewer,
    setupRuntime,
  } = options
  window.localStorage.setItem('petbuddies.flags', JSON.stringify(flags))

  const runtime = createAppRuntime(viewer)
  setupRuntime?.(runtime)
  const { backend, mutations } = runtime
  const router = createAppRouter({
    context: {
      queryClient: createQueryClient(),
      backend,
      mutations,
      viewer,
      loadViewer,
    },
    initialEntries: [path],
  })

  render(<RouterProvider router={router} />)
  return router
}
