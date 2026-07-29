import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderAppAt } from '../../../helpers/render-app'
import { ANONYMOUS_VIEWER, TEST_VIEWER } from '../../../helpers/viewers'

const signOut = vi.fn()
let liveSession: { user: { name: string; email: string } } | null = null

vi.mock('../../../../src/features/auth/auth-client', () => ({
  authClient: {
    signIn: { email: vi.fn(), social: vi.fn() },
    signUp: { email: vi.fn() },
    signOut: (...args: unknown[]) => signOut(...args),
    useSession: () => ({ data: liveSession }),
  },
}))

beforeEach(() => {
  signOut.mockReset().mockResolvedValue({ data: {}, error: null })
  liveSession = null
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

  /**
   * Returning from Google boots an already-cached SPA shell, so the router
   * context can still hold the anonymous viewer resolved before sign-in. The
   * live session has to win, or a user who just authenticated is shown
   * "Sign in" until they reload — which is exactly what happened in staging.
   */
  it('shows the live session even when router context is still anonymous', async () => {
    liveSession = { user: { name: 'Looth Ibrahim', email: 'hello@looth.xyz' } }

    renderAppAt('/you', { viewer: ANONYMOUS_VIEWER })

    expect(await screen.findByText('Looth Ibrahim')).toBeTruthy()
    expect(screen.getByText('hello@looth.xyz')).toBeTruthy()
    expect(screen.queryByRole('link', { name: /sign in/i })).toBeNull()
  })

  it('prefers the live session over a stale context identity', async () => {
    liveSession = { user: { name: 'Looth Ibrahim', email: 'hello@looth.xyz' } }

    renderAppAt('/you', { viewer: TEST_VIEWER })

    expect(await screen.findByText('Looth Ibrahim')).toBeTruthy()
    expect(screen.queryByText(TEST_VIEWER.email)).toBeNull()
  })

  /**
   * The desktop rail also links to /admin/users, but the rail is desktop-only.
   * Without an entry here an administrator on a phone had no way to reach the
   * screen except by typing the URL.
   */
  it('offers user management to an administrator', async () => {
    renderAppAt('/you', { viewer: { ...TEST_VIEWER, role: 'admin' } })

    const link = await screen.findByRole('link', { name: /user management/i })
    expect(link.getAttribute('href')).toContain('/admin/users')
  })

  it('does not offer it to a moderator or a plain user', async () => {
    renderAppAt('/you', { viewer: { ...TEST_VIEWER, role: 'moderator' } })
    await screen.findByRole('button', { name: /sign out/i })
    expect(screen.queryByRole('link', { name: /user management/i })).toBeNull()

    cleanup()

    renderAppAt('/you', { viewer: TEST_VIEWER })
    await screen.findByRole('button', { name: /sign out/i })
    expect(screen.queryByRole('link', { name: /user management/i })).toBeNull()
  })

  it('offers it on the strength of a live admin session over a stale context', async () => {
    liveSession = {
      user: { name: 'Looth Ibrahim', email: 'hello@looth.xyz', role: 'admin' },
    } as typeof liveSession

    renderAppAt('/you', { viewer: ANONYMOUS_VIEWER })

    expect(await screen.findByRole('link', { name: /user management/i })).toBeTruthy()
  })
})
