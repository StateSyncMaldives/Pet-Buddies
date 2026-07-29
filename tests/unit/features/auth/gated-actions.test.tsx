import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { renderAppAt } from '../../../helpers/render-app'
import { DESKTOP_VIEWPORT, PHONE_VIEWPORT, setViewport } from '../../../helpers/viewport'
import { ANONYMOUS_VIEWER, TEST_VIEWER } from '../../../helpers/viewers'

vi.mock('../../../../src/features/auth/auth-client', () => ({
  authClient: {
    signIn: { email: vi.fn(), social: vi.fn() },
    signUp: { email: vi.fn() },
    signOut: vi.fn(),
    useSession: () => ({ data: null }),
  },
}))

beforeAll(() => {
  window.scrollTo = vi.fn()
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  setViewport(PHONE_VIEWPORT)
})

describe('gated actions while anonymous', () => {
  it('sends Apply to adopt to sign-in, preserving where to return', async () => {
    const router = renderAppAt('/browse/listings/mishka', { viewer: ANONYMOUS_VIEWER })

    await screen.findByRole('heading', { name: 'Mishka' })
    await userEvent.click(screen.getByRole('button', { name: 'Apply to adopt' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'))
    expect(String((router.state.location.search as { redirect?: string }).redirect)).toContain(
      '/browse/listings/mishka',
    )
  })

  it('sends Create listing to sign-in', async () => {
    setViewport(DESKTOP_VIEWPORT)
    const router = renderAppAt('/report', { viewer: ANONYMOUS_VIEWER })

    await screen.findByText('Report a pet')
    await userEvent.click(screen.getByRole('button', { name: 'Create listing' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'))
  })

  it('does not fire the save mutation from a listing card', async () => {
    const toggleSavedListing = vi.fn()
    const router = renderAppAt('/browse/listings/mishka', {
      viewer: ANONYMOUS_VIEWER,
      setupRuntime: (runtime) => {
        runtime.mutations.toggleSavedListing = toggleSavedListing
      },
    })

    await screen.findByRole('heading', { name: 'Mishka' })
    // Several cards are on screen; the first Save button is the detail's own.
    await userEvent.click(screen.getAllByRole('button', { name: /save/i })[0]!)

    await waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'))
    expect(toggleSavedListing).not.toHaveBeenCalled()
  })
})

describe('gated actions while signed in', () => {
  it('opens the adoption inquiry directly, with no sign-in detour', async () => {
    const router = renderAppAt('/browse/listings/mishka', { viewer: TEST_VIEWER })

    await screen.findByRole('heading', { name: 'Mishka' })
    await userEvent.click(screen.getByRole('button', { name: 'Apply to adopt' }))

    expect(await screen.findByText('Adoption inquiry')).toBeTruthy()
    expect(router.state.location.pathname).toBe('/browse/listings/mishka')
  })

  it('fires the save mutation', async () => {
    const toggleSavedListing = vi
      .fn()
      .mockResolvedValue({ ok: true, data: { listingId: 'mishka', saved: true } })
    renderAppAt('/browse/listings/mishka', {
      viewer: TEST_VIEWER,
      setupRuntime: (runtime) => {
        runtime.mutations.toggleSavedListing = toggleSavedListing
      },
    })

    await screen.findByRole('heading', { name: 'Mishka' })
    await userEvent.click(screen.getAllByRole('button', { name: /save/i })[0]!)

    await waitFor(() => expect(toggleSavedListing).toHaveBeenCalled())
  })

  it('opens the create-listing form directly', async () => {
    setViewport(DESKTOP_VIEWPORT)
    renderAppAt('/report', { viewer: TEST_VIEWER })

    await screen.findByText('Report a pet')
    await userEvent.click(screen.getByRole('button', { name: 'Create listing' }))

    expect(await screen.findByText('New listing')).toBeTruthy()
  })
})
