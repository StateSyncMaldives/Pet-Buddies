import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { renderAppAt as renderAt } from '../../helpers/render-app'
import { DESKTOP_VIEWPORT, PHONE_VIEWPORT, setViewport } from '../../helpers/viewport'

beforeAll(() => {
  window.scrollTo = vi.fn()
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  setViewport(PHONE_VIEWPORT)
})

describe('desktop listing detail', () => {
  it('renders the detail route as a page, replacing the browse feed', async () => {
    setViewport(DESKTOP_VIEWPORT)
    renderAt('/browse/listings/mishka')

    expect(await screen.findByRole('heading', { name: 'Mishka' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Apply to adopt' })).toBeTruthy()

    // The browse feed is replaced by the detail page on desktop.
    expect(screen.queryByText('Find a buddy')).toBeNull()
    // The phone overlay presentation is not used.
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull()
    // Preserves browse search params, matching the overlay's Back behavior.
    expect(screen.getByRole('link', { name: 'Back to Browse' }).getAttribute('href')).toMatch(/^\/browse(\?|$)/)
  })

  it('supports saving the listing from the desktop detail page', async () => {
    const user = userEvent.setup()
    setViewport(DESKTOP_VIEWPORT)
    renderAt('/browse/listings/mishka')

    await screen.findByRole('heading', { name: 'Mishka' })

    const save = screen.getByRole('button', { name: 'Save' })
    expect(save.getAttribute('aria-pressed')).toBe('false')
    await user.click(save)

    expect(screen.getByRole('button', { name: 'Remove from saved' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('keeps the overlay presentation on phone widths', async () => {
    renderAt('/browse/listings/mishka')

    expect(await screen.findByRole('heading', { name: 'Mishka' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Back to Browse' })).toBeNull()
  })
})
