// @vitest-environment happy-dom

import { cleanup, render, screen, within } from '@testing-library/react'
import { RouterProvider } from '@tanstack/react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { createAppRouter } from '../../../src/router'
import { createAppRuntime } from '../../../src/server/runtime/app-session'
import { DESKTOP_VIEWPORT, PHONE_VIEWPORT, setViewport } from '../../helpers/viewport'

function renderAt(path: string) {
  window.localStorage.setItem(
    'petbuddies.flags',
    JSON.stringify({ onboarded: true, installed: true, installDismissed: true }),
  )

  const { backend, session } = createAppRuntime()
  const router = createAppRouter({
    context: {
      backend,
      viewerId: session.viewerId,
      mockUser: session.mockUser,
      moderatorId: session.moderatorId,
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
  setViewport(PHONE_VIEWPORT)
})

describe('desktop rail navigation', () => {
  it('shows all five destinations in the rail with the current one marked', async () => {
    setViewport(DESKTOP_VIEWPORT)
    renderAt('/report')

    await screen.findByText('Report a pet')

    const rail = screen.getByRole('navigation', { name: 'Primary' })
    const expected: Array<[string, string]> = [
      ['Browse', '/browse'],
      ['Report', '/report'],
      ['Vets', '/vets'],
      ['You', '/you'],
      ['Saved', '/saved'],
    ]
    for (const [name, href] of expected) {
      const link = within(rail).getByRole('link', { name })
      expect(link.getAttribute('href')).toBe(href)
    }
    expect(within(rail).getByRole('link', { name: 'Report' }).getAttribute('aria-current')).toBe('page')
  })

  it('hosts the Create listing action and the Review queue entry', async () => {
    setViewport(DESKTOP_VIEWPORT)
    renderAt('/report')

    await screen.findByText('Report a pet')

    const rail = screen.getByRole('navigation', { name: 'Primary' })
    expect(within(rail).getByRole('button', { name: 'Create listing' })).toBeTruthy()
    expect(within(rail).getByRole('button', { name: 'Review queue' })).toBeTruthy()
  })

  it('replaces the bottom pill nav on desktop instead of duplicating it', async () => {
    setViewport(DESKTOP_VIEWPORT)
    renderAt('/report')

    await screen.findByText('Report a pet')

    expect(screen.getAllByRole('navigation')).toHaveLength(1)
    expect(screen.getAllByRole('link', { name: 'Saved' })).toHaveLength(1)
  })

  it('keeps the bottom pill nav (and no rail) at phone width', async () => {
    renderAt('/report')

    await screen.findByText('Report a pet')

    expect(screen.queryByRole('navigation', { name: 'Primary' })).toBeNull()
    expect(screen.getAllByRole('navigation')).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'Saved' })).toBeTruthy()
  })
})
