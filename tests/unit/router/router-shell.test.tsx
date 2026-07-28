import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider } from '@tanstack/react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { createAppRouter } from '../../../src/router'
import { createQueryClient } from '../../../src/query/client'
import { createAppRuntime } from '../../../src/server/runtime/app-session'
import { TEST_VIEWER } from '../../helpers/viewers'

function renderAt(
  path: string,
  flags: { onboarded: boolean; installed: boolean; installDismissed: boolean } = {
    onboarded: true,
    installed: true,
    installDismissed: true,
  },
  setupRuntime?: (runtime: ReturnType<typeof createAppRuntime>) => void,
) {
  window.localStorage.setItem('petbuddies.flags', JSON.stringify(flags))

  const runtime = createAppRuntime(TEST_VIEWER)
  setupRuntime?.(runtime)
  const { backend, mutations, viewer } = runtime
  const router = createAppRouter({
    context: {
      queryClient: createQueryClient(),
      backend,
      mutations,
      viewer,
    },
    initialEntries: [path],
  })

  render(<RouterProvider router={router} />)

  return router
}

beforeAll(() => {
  window.scrollTo = vi.fn()
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe('app router shell', () => {
  it('redirects the root path to browse and renders the browse screen', async () => {
    const router = renderAt('/')

    await screen.findByText('Find a buddy')

    expect(router.state.location.pathname).toBe('/browse')
  })

  it('renders the report screen at /report', async () => {
    renderAt('/report')

    expect(await screen.findByText('Report a pet')).toBeTruthy()
  })

  it('hydrates browse filters from URL search params on direct loads', async () => {
    renderAt('/browse?species=bird&q=kiwi&tags=Hand-tame')

    expect(await screen.findByDisplayValue('kiwi')).toBeTruthy()
    expect(screen.getByText('1 bird available')).toBeTruthy()
    expect(screen.getByText('Kiwi')).toBeTruthy()
  })

  it('writes browse filter changes to URL search params', async () => {
    const user = userEvent.setup()
    const router = renderAt('/browse')

    await screen.findByText('Find a buddy')
    await user.click(screen.getByRole('radio', { name: 'Birds' }))

    await waitFor(() => {
      expect(router.state.location.search).toMatchObject({ species: 'bird', query: '', tags: [] })
    })

    await user.click(screen.getByRole('button', { name: 'Hand-tame' }))
    await waitFor(() => {
      expect(router.state.location.search).toMatchObject({ species: 'bird', query: '', tags: ['Hand-tame'] })
    })

    await user.type(screen.getByRole('searchbox'), 'kiwi')
    await waitFor(() => {
      expect(router.state.location.search).toMatchObject({ species: 'bird', query: 'kiwi', tags: ['Hand-tame'] })
    })
  })

  it('derives the active bottom-nav tab from the pathname and navigates on click', async () => {
    const user = userEvent.setup()
    const router = renderAt('/report')

    await screen.findByText('Report a pet')

    const reportTab = screen.getAllByRole('link', { name: 'Report' })[0]
    expect(reportTab.getAttribute('href')).toBe('/report')
    expect(reportTab.getAttribute('aria-current')).toBe('page')

    const savedTab = screen.getAllByRole('link', { name: 'Saved' })[0]
    expect(savedTab.getAttribute('href')).toBe('/saved')
    await user.click(savedTab)

    expect(router.state.location.pathname).toBe('/saved')
    expect(await screen.findByRole('heading', { name: 'Saved' })).toBeTruthy()
  })

  it('renders a not-found shell for unknown routes', async () => {
    const router = renderAt('/missing-route')

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeTruthy()
    expect(router.state.location.pathname).toBe('/missing-route')
  })

  it('shows the install sheet on browse when onboarding is complete and install is pending', async () => {
    renderAt('/browse', { onboarded: true, installed: false, installDismissed: false })

    await screen.findByText('Find a buddy')

    expect(screen.getByRole('button', { name: 'Add to Home Screen' })).toBeTruthy()
  })

  it('does not show the install sheet on non-browse routes even when install is pending', async () => {
    renderAt('/report', { onboarded: true, installed: false, installDismissed: false })

    await screen.findByText('Report a pet')

    expect(screen.queryByRole('button', { name: 'Add to Home Screen' })).toBeNull()
  })

  it('navigates from browse into a listing detail route and back out again', async () => {
    const user = userEvent.setup()
    const router = renderAt('/browse')

    await screen.findByText('Find a buddy')
    await user.click(screen.getByRole('button', { name: 'View Mishka, cat in Maafannu, Malé' }))

    expect(router.state.location.pathname).toBe('/browse/listings/mishka')
    expect(await screen.findByRole('heading', { name: 'Mishka' })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Back' }))

    expect(router.state.location.pathname).toBe('/browse')
    expect(await screen.findByText('Find a buddy')).toBeTruthy()
  })

  it('preserves browse search params when opening and closing a listing detail route', async () => {
    const user = userEvent.setup()
    const router = renderAt('/browse?species=bird&q=kiwi&tags=Hand-tame')

    await screen.findByText('Kiwi')
    await user.click(screen.getByRole('button', { name: /View Kiwi, bird in Maafannu, Mal/ }))

    expect(router.state.location.pathname).toBe('/browse/listings/kiwi')
    expect(router.state.location.search).toMatchObject({ species: 'bird', query: 'kiwi', tags: ['Hand-tame'] })

    await user.click(await screen.findByRole('button', { name: 'Back' }))

    expect(router.state.location.pathname).toBe('/browse')
    expect(router.state.location.search).toMatchObject({ species: 'bird', query: 'kiwi', tags: ['Hand-tame'] })
  })

  it('navigates to the detail route from the featured hero card', async () => {
    const user = userEvent.setup()
    const router = renderAt('/browse')

    await screen.findByText('Find a buddy')
    await user.click(screen.getByRole('button', { name: 'Featured: Mishka' }))

    expect(router.state.location.pathname).toBe('/browse/listings/mishka')
    expect(await screen.findByRole('heading', { name: 'Mishka' })).toBeTruthy()
  })

  it('navigates to the detail route from a saved listing card', async () => {
    const user = userEvent.setup()
    const router = renderAt('/browse')

    await screen.findByText('Find a buddy')
    await user.click(screen.getAllByRole('button', { name: 'Save' })[0])
    await user.click(screen.getAllByRole('link', { name: 'Saved' })[0])
    await screen.findByRole('heading', { name: 'Saved' })
    await user.click(screen.getByRole('button', { name: 'View Mishka, cat in Maafannu, Malé' }))

    expect(router.state.location.pathname).toBe('/browse/listings/mishka')
    expect(await screen.findByRole('heading', { name: 'Mishka' })).toBeTruthy()
  })

  it('refreshes saved route data after removing a saved listing', async () => {
    const user = userEvent.setup()
    renderAt('/saved', undefined, ({ backend, viewer }) => {
      backend.toggleSavedListing({ listingId: 'mishka', viewerId: viewer.kind === 'user' ? viewer.id : '' })
    })

    await screen.findByRole('button', { name: 'View Mishka, cat in Maafannu, Malé' })
    await user.click(screen.getByRole('button', { name: 'Remove from saved' }))

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'View Mishka, cat in Maafannu, Malé' })).toBeNull()
    })
    expect(screen.getByText('Nothing saved yet.')).toBeTruthy()
  })

  it('opens the listing detail overlay on direct detail loads', async () => {
    renderAt('/browse/listings/mishka')

    expect(await screen.findByRole('heading', { name: 'Mishka' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy()
  })

  it('renders the not-found shell for a direct load of an unknown listing id', async () => {
    const router = renderAt('/browse/listings/does-not-exist')

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeTruthy()
    expect(router.state.location.pathname).toBe('/browse/listings/does-not-exist')
    expect(screen.queryByText('Find a buddy')).toBeNull()
  })

  it('renders sent adoption inquiries from the you route loader', async () => {
    renderAt('/you?view=inquiries', undefined, ({ backend, viewer }) => {
      backend.createInquiry({
        viewerId: viewer.kind === 'user' ? viewer.id : '',
        request: {
          listingId: 'mishka',
          message: 'Could we visit Mishka this week?',
        },
      })
    })

    expect(await screen.findByText('1 inquiry sent.')).toBeTruthy()
    expect(screen.getByText('Mishka')).toBeTruthy()
    expect(screen.getByText('"Could we visit Mishka this week?"')).toBeTruthy()
  })

  // Signed-in viewers reach these flows directly; anonymous ones are routed to
  // /sign-in instead (see tests/unit/features/auth/gated-actions.test.tsx).
  it('opens add-listing for a signed-in viewer', async () => {
    const user = userEvent.setup()
    renderAt('/browse')

    await screen.findByText('Find a buddy')
    await user.click(screen.getByRole('button', { name: 'Add a listing' }))

    expect(await screen.findByText('Posting as')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Submit for review' })).toBeTruthy()
  })

  it('opens the adoption inquiry for a signed-in viewer', async () => {
    const user = userEvent.setup()
    renderAt('/browse/listings/mishka')

    await screen.findByRole('heading', { name: 'Mishka' })
    await user.click(screen.getByRole('button', { name: 'Apply to adopt' }))

    expect(await screen.findByText('Your message')).toBeTruthy()
    expect(screen.getByDisplayValue(/interested in adopting Mishka/)).toBeTruthy()
  })

  it('routes a bird lost-found report from the report UI', async () => {
    const user = userEvent.setup()
    renderAt('/report')

    await screen.findByText('Report a pet')
    await user.click(screen.getByRole('button', { name: 'Bird' }))
    await user.selectOptions(screen.getByRole('combobox'), 'Cockatiel')
    await user.type(screen.getByPlaceholderText('Area, e.g. Maafannu, Malé'), 'Maafannu, Malé')
    await user.type(screen.getByPlaceholderText(/Colour, collar/), 'Found a tame cockatiel near the harbour.')
    await user.click(screen.getByRole('button', { name: 'Send report' }))

    expect(await screen.findByRole('heading', { name: 'Report sent' })).toBeTruthy()
    expect(screen.getByText(/Zoophilist Society Maldives/)).toBeTruthy()
  })

  it('supports add listing to moderation approval from the app shell', async () => {
    const user = userEvent.setup()
    renderAt('/browse')

    await screen.findByText('Find a buddy')
    await user.click(screen.getByRole('button', { name: 'Add a listing' }))
    await user.type(await screen.findByPlaceholderText('e.g. Mishka'), 'Sunny')
    await user.type(screen.getByPlaceholderText('e.g. 8 months'), '10 months')
    await user.type(screen.getByPlaceholderText('e.g. Maafannu'), 'Maafannu, Malé')
    await user.click(screen.getByRole('button', { name: 'Submit for review' }))
    expect(await screen.findByRole('heading', { name: 'Submitted!' })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Back to browse' }))
    await user.click(screen.getByRole('button', { name: 'Review queue' }))
    await user.click(await screen.findByRole('button', { name: 'Approve and publish Sunny' }))

    expect(await screen.findByText('Sunny is now live')).toBeTruthy()
  })

})

describe('redesigned browse listing menu', () => {
  it('exposes the species choices as a radiogroup with checked state', async () => {
    const user = userEvent.setup()
    renderAt('/browse')

    await screen.findByText('Find a buddy')
    const group = screen.getByRole('radiogroup', { name: /species/i })
    expect(group).toBeTruthy()

    const cats = screen.getByRole('radio', { name: 'Cats' })
    const birds = screen.getByRole('radio', { name: 'Birds' })
    expect(cats.getAttribute('aria-checked')).toBe('true')
    expect(birds.getAttribute('aria-checked')).toBe('false')

    await user.click(birds)
    await waitFor(() => {
      expect(screen.getByRole('radio', { name: 'Birds' }).getAttribute('aria-checked')).toBe('true')
    })
    expect(screen.getByRole('radio', { name: 'Cats' }).getAttribute('aria-checked')).toBe('false')
  })

  it('switching species preserves the typed search and clears active trait filters', async () => {
    const user = userEvent.setup()
    const router = renderAt('/browse?q=luna&tags=Vaccinated')

    await screen.findByDisplayValue('luna')
    await user.click(screen.getByRole('radio', { name: 'Birds' }))

    await waitFor(() => {
      expect(router.state.location.search).toMatchObject({ species: 'bird', query: 'luna', tags: [] })
    })
    // The typed query survives the switch and is still shown in the field.
    expect(screen.getByDisplayValue('luna')).toBeTruthy()
  })

  it('shows only cat trait filters for cats and only bird trait filters for birds', async () => {
    const user = userEvent.setup()
    renderAt('/browse')

    await screen.findByText('Find a buddy')
    // Cat vocabulary present, bird-only trait absent.
    expect(screen.getByRole('button', { name: 'Kitten' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Bonded pair' })).toBeNull()

    await user.click(screen.getByRole('radio', { name: 'Birds' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Bonded pair' })).toBeTruthy()
    })
    // Cat-only trait gone once Birds is active.
    expect(screen.queryByRole('button', { name: 'Kitten' })).toBeNull()
  })

  it('narrows the feed and reflects pressed state when a trait chip is toggled', async () => {
    const user = userEvent.setup()
    const router = renderAt('/browse')

    await screen.findByText('Find a buddy')
    expect(screen.getByText('4 cats available')).toBeTruthy()

    const kitten = screen.getByRole('button', { name: 'Kitten' })
    expect(kitten.getAttribute('aria-pressed')).toBe('false')
    await user.click(kitten)

    await waitFor(() => {
      expect(router.state.location.search).toMatchObject({ species: 'cat', tags: ['Kitten'] })
    })
    // Only Biscuit is a Kitten in the seed → feed narrows to 1.
    await waitFor(() => {
      expect(screen.getByText('1 cat available')).toBeTruthy()
    })
    // Scope to the feed card (unique aria-label); pet names also appear in the hero.
    expect(screen.getByRole('button', { name: 'View Biscuit, cat in Villingili' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /View Mishka/ })).toBeNull()
    expect(screen.getByRole('button', { name: 'Kitten' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('hydrates a cat trait-filtered state directly from the URL', async () => {
    renderAt('/browse?species=cat&tags=Kitten')

    await screen.findByRole('button', { name: 'View Biscuit, cat in Villingili' })
    expect(screen.getByText('1 cat available')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Kitten' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('radio', { name: 'Cats' }).getAttribute('aria-checked')).toBe('true')
  })

  it('hides the count line and shows the species-named empty state when nothing matches', async () => {
    renderAt('/browse?q=zzzzz')

    await screen.findByText(/No cats match your search yet/i)
    expect(screen.queryByText(/available$/)).toBeNull()
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeTruthy()
  })

  it('announces the listing count as a polite status region', async () => {
    renderAt('/browse')

    const count = await screen.findByText('4 cats available')
    const status = count.closest('[role="status"]')
    expect(status).toBeTruthy()
    expect(status?.getAttribute('aria-live')).toBe('polite')
  })
})
