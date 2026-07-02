import { describe, expect, it } from 'vitest'

import { createAppRouter } from '../../src/router'
import { createAppRuntime } from '../../src/server/runtime/app-session'

function testContext() {
  const { backend, session } = createAppRuntime()
  return { backend, viewerId: session.viewerId }
}

describe('createAppRouter', () => {
  it('redirects the root entry to browse', async () => {
    const router = createAppRouter({ context: testContext(), initialEntries: ['/'] })

    await router.load()

    expect(router.state.location.pathname).toBe('/browse')
  })

  it('enables intent-based preloading for navigation links', () => {
    const router = createAppRouter({ context: testContext(), initialEntries: ['/browse'] })

    expect(router.options.defaultPreload).toBe('intent')
  })

  it('keeps deep-link detail routes addressable', async () => {
    const router = createAppRouter({ context: testContext(), initialEntries: ['/browse/listings/luna'] })

    await router.load()

    expect(router.state.location.pathname).toBe('/browse/listings/luna')
  })

  it('keeps unknown routes addressable instead of bouncing to browse', async () => {
    const router = createAppRouter({ context: testContext(), initialEntries: ['/definitely-not-a-route'] })

    await router.load()

    expect(router.state.location.pathname).toBe('/definitely-not-a-route')
  })

  it('resolves the detail loader through the injected backend context', async () => {
    const { backend, viewerId } = testContext()
    const router = createAppRouter({ context: { backend, viewerId }, initialEntries: ['/browse/listings/luna'] })

    await router.load()

    const detailMatch = router.state.matches.find((match) => match.routeId.includes('listings'))
    expect(detailMatch?.loaderData).toMatchObject({ id: 'luna' })
  })

  it('surfaces a not-found match when the detail loader cannot resolve the listing id', async () => {
    const router = createAppRouter({ context: testContext(), initialEntries: ['/browse/listings/does-not-exist'] })

    await router.load()

    const detailMatch = router.state.matches.find((match) => match.routeId.includes('listings'))
    expect(detailMatch?.status).toBe('notFound')
  })
})
