import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { renderAppAt as renderAt } from '../../helpers/render-app'
import { DESKTOP_VIEWPORT, PHONE_VIEWPORT, setViewport } from '../../helpers/viewport'
import { ANONYMOUS_VIEWER } from '../../helpers/viewers'

beforeAll(() => {
  window.scrollTo = vi.fn()
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  setViewport(PHONE_VIEWPORT)
})

/**
 * These cover the *presentation* rule — full-screen sheets on phones, centered
 * dialogs on desktop. Since C4 the sign-in step is a route rather than an
 * overlay, so the walks start from a signed-in viewer (renderAt's default);
 * the anonymous redirect itself is covered by the gated-actions spec.
 */
describe('desktop dialog promotion', () => {
  it('walks apply to adoption inquiry dialog to inquiry sent', async () => {
    const user = userEvent.setup()
    setViewport(DESKTOP_VIEWPORT)
    renderAt('/browse/listings/mishka')

    await screen.findByRole('heading', { name: 'Mishka' })
    await user.click(screen.getByRole('button', { name: 'Apply to adopt' }))

    const inquiryDialog = await screen.findByRole('dialog', { name: 'Adoption inquiry' })
    await user.click(within(inquiryDialog).getByRole('button', { name: 'Send inquiry' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
    expect(screen.getByText('Inquiry sent')).toBeTruthy()
  })

  it('closes a dialog with Escape', async () => {
    const user = userEvent.setup()
    setViewport(DESKTOP_VIEWPORT)
    renderAt('/report')

    await screen.findByText('Report a pet')
    await user.click(screen.getByRole('button', { name: 'Create listing' }))

    await screen.findByRole('dialog', { name: 'New listing' })
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('opens the create-listing form as a dialog', async () => {
    const user = userEvent.setup()
    setViewport(DESKTOP_VIEWPORT)
    renderAt('/report')

    await screen.findByText('Report a pet')
    await user.click(screen.getByRole('button', { name: 'Create listing' }))

    expect(await screen.findByRole('dialog', { name: 'New listing' })).toBeTruthy()
  })

  it('keeps full-screen sheets without dialog role on phone widths', async () => {
    const user = userEvent.setup()
    renderAt('/browse/listings/mishka')

    await screen.findByRole('heading', { name: 'Mishka' })
    await user.click(screen.getByRole('button', { name: 'Apply to adopt' }))

    expect(await screen.findByText('Your message')).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('routes an anonymous visitor to sign-in instead of promoting a dialog', async () => {
    const user = userEvent.setup()
    setViewport(DESKTOP_VIEWPORT)
    const router = renderAt('/browse/listings/mishka', { viewer: ANONYMOUS_VIEWER })

    await screen.findByRole('heading', { name: 'Mishka' })
    await user.click(screen.getByRole('button', { name: 'Apply to adopt' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
