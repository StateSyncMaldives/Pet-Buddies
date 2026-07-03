// @vitest-environment happy-dom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider } from '@tanstack/react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { createAppRouter } from '../../../src/router'
import { createAppRuntime } from '../../../src/server/runtime/app-session'
import { StoreProvider } from '../../../src/store/store'

function renderAt(
  path: string,
  flags: { onboarded: boolean; installed: boolean; installDismissed: boolean } = {
    onboarded: true,
    installed: true,
    installDismissed: true,
  },
) {
  window.localStorage.setItem('petbuddies.flags', JSON.stringify(flags))

  const { backend, session } = createAppRuntime()
  const router = createAppRouter({ context: { backend, viewerId: session.viewerId }, initialEntries: [path] })

  render(
    <StoreProvider backend={backend} viewerId={session.viewerId} mockUser={session.mockUser} moderatorId={session.moderatorId}>
      <RouterProvider router={router} />
    </StoreProvider>,
  )

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
    await user.click(screen.getByRole('button', { name: 'Birds' }))

    await waitFor(() => {
      expect(router.state.location.search).toMatchObject({ species: 'bird', query: '', tags: [] })
    })

    await user.click(screen.getByRole('button', { name: 'Hand-tame' }))
    await waitFor(() => {
      expect(router.state.location.search).toMatchObject({ species: 'bird', query: '', tags: ['Hand-tame'] })
    })

    await user.type(screen.getByRole('textbox'), 'kiwi')
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
})
