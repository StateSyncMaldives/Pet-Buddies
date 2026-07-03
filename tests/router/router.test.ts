import { describe, expect, it } from 'vitest'

import { validateBrowseSearch } from '../../src/router/browse-search'
import { createAppRouter } from '../../src/router'
import { createAppRuntime } from '../../src/server/runtime/app-session'

function testContext() {
  const { backend, session } = createAppRuntime()
  return {
    backend,
    viewerId: session.viewerId,
    mockUser: session.mockUser,
    moderatorId: session.moderatorId,
  }
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

  it('validates browse search params with defaults and sanitized tags', () => {
    expect(
      validateBrowseSearch({
        species: 'dog',
        q: ' mishka ',
        tags: ['', 'Vaccinated', 'Vaccinated'],
      }),
    ).toEqual({
      species: 'cat',
      query: 'mishka',
      tags: ['Vaccinated'],
    })
  })

  it('validates detail route search params with the same browse filter contract', () => {
    expect(validateBrowseSearch({ species: 'bird', q: 'kiwi', tags: 'Hand-tame' })).toEqual({
      species: 'bird',
      query: 'kiwi',
      tags: ['Hand-tame'],
    })
  })

  it('keeps unknown routes addressable instead of bouncing to browse', async () => {
    const router = createAppRouter({ context: testContext(), initialEntries: ['/definitely-not-a-route'] })

    await router.load()

    expect(router.state.location.pathname).toBe('/definitely-not-a-route')
  })

  it('resolves the detail loader through the injected backend context', async () => {
    const context = testContext()
    const router = createAppRouter({ context, initialEntries: ['/browse/listings/luna'] })

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
