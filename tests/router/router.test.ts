import { describe, expect, it } from 'vitest'

import { createAppRouter } from '../../src/router'

describe('createAppRouter', () => {
  it('redirects the root entry to browse', async () => {
    const router = createAppRouter({ initialEntries: ['/'] })

    await router.load()

    expect(router.state.location.pathname).toBe('/browse')
  })

  it('enables intent-based preloading for navigation links', () => {
    const router = createAppRouter({ initialEntries: ['/browse'] })

    expect(router.options.defaultPreload).toBe('intent')
  })

  it('keeps deep-link detail routes addressable', async () => {
    const router = createAppRouter({ initialEntries: ['/browse/listings/luna'] })

    await router.load()

    expect(router.state.location.pathname).toBe('/browse/listings/luna')
  })

  it('keeps unknown routes addressable instead of bouncing to browse', async () => {
    const router = createAppRouter({ initialEntries: ['/definitely-not-a-route'] })

    await router.load()

    expect(router.state.location.pathname).toBe('/definitely-not-a-route')
  })
})
