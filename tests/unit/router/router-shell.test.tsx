// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider } from '@tanstack/react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { createAppRouter } from '../../../src/router'
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

  const router = createAppRouter({ initialEntries: [path] })

  render(
    <StoreProvider>
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
})
