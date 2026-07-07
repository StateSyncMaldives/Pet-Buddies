import { cleanup, screen, waitFor, within } from '@testing-library/react'
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

describe('desktop dialog promotion', () => {
  it('walks apply to sign-in dialog to adoption inquiry dialog to inquiry sent', async () => {
    const user = userEvent.setup()
    setViewport(DESKTOP_VIEWPORT)
    renderAt('/browse/listings/mishka')

    await screen.findByRole('heading', { name: 'Mishka' })
    await user.click(screen.getByRole('button', { name: 'Apply to adopt' }))

    // Signed out: the auth surface appears as a centered dialog.
    const authDialog = await screen.findByRole('dialog', { name: 'Sign in' })
    await user.click(within(authDialog).getByRole('button', { name: 'Continue with Google' }))

    // Then the adoption inquiry compose surface, also as a dialog.
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

    await screen.findByRole('dialog', { name: 'Sign in' })
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('opens the create-listing form as a dialog once signed in', async () => {
    const user = userEvent.setup()
    setViewport(DESKTOP_VIEWPORT)
    renderAt('/report')

    await screen.findByText('Report a pet')
    await user.click(screen.getByRole('button', { name: 'Create listing' }))
    await user.click(await screen.findByRole('button', { name: 'Continue with Google' }))

    expect(await screen.findByRole('dialog', { name: 'New listing' })).toBeTruthy()
  })

  it('keeps full-screen sheets without dialog role on phone widths', async () => {
    const user = userEvent.setup()
    renderAt('/browse/listings/mishka')

    await screen.findByRole('heading', { name: 'Mishka' })
    await user.click(screen.getByRole('button', { name: 'Apply to adopt' }))

    expect(await screen.findByText('Sign in to list a pet')).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
