import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderAppAt } from '../../../helpers/render-app'
import { ANONYMOUS_VIEWER, TEST_VIEWER } from '../../../helpers/viewers'

const signOut = vi.fn()

vi.mock('../../../../src/features/auth/auth-client', () => ({
  authClient: {
    signIn: { email: vi.fn(), social: vi.fn() },
    signUp: { email: vi.fn() },
    signOut: (...args: unknown[]) => signOut(...args),
    useSession: () => ({ data: null }),
  },
}))

beforeEach(() => {
  signOut.mockReset().mockResolvedValue({ data: {}, error: null })
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe('account menu', () => {
  it('shows the signed-in display name and email', async () => {
    renderAppAt('/you', { viewer: TEST_VIEWER })

    expect(await screen.findByText(TEST_VIEWER.displayName)).toBeTruthy()
    expect(screen.getByText(TEST_VIEWER.email)).toBeTruthy()
  })

  it('signs the viewer out through the auth client', async () => {
    renderAppAt('/you', { viewer: TEST_VIEWER })

    await userEvent.click(await screen.findByRole('button', { name: /sign out/i }))

    await waitFor(() => expect(signOut).toHaveBeenCalled())
  })

  it('offers a sign-in link that returns to the current page', async () => {
    renderAppAt('/you', { viewer: ANONYMOUS_VIEWER })

    const link = await screen.findByRole('link', { name: /sign in/i })

    expect(link.getAttribute('href')).toContain('/sign-in')
    expect(decodeURIComponent(link.getAttribute('href') ?? '')).toContain('redirect=/you')
  })

  it('does not offer sign-out to an anonymous visitor', async () => {
    renderAppAt('/you', { viewer: ANONYMOUS_VIEWER })

    await screen.findByRole('link', { name: /sign in/i })
    expect(screen.queryByRole('button', { name: /sign out/i })).toBeNull()
  })

  it('keeps My listings behind sign-in for an anonymous visitor', async () => {
    renderAppAt('/you?view=listings', { viewer: ANONYMOUS_VIEWER })

    expect(await screen.findByText(/sign in to list a pet/i)).toBeTruthy()
  })
})
