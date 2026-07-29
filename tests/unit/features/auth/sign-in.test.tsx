import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderAppAt } from '../../../helpers/render-app'
import { ANONYMOUS_VIEWER } from '../../../helpers/viewers'

const signInEmail = vi.fn()
const signUpEmail = vi.fn()
const signInSocial = vi.fn()

vi.mock('../../../../src/features/auth/auth-client', () => ({
  authClient: {
    signIn: {
      email: (...args: unknown[]) => signInEmail(...args),
      social: (...args: unknown[]) => signInSocial(...args),
    },
    signUp: { email: (...args: unknown[]) => signUpEmail(...args) },
    signOut: vi.fn(),
    useSession: () => ({ data: null }),
  },
}))

beforeEach(() => {
  signInEmail.mockReset().mockResolvedValue({ data: {}, error: null })
  signUpEmail.mockReset().mockResolvedValue({ data: {}, error: null })
  signInSocial.mockReset().mockResolvedValue({ data: {}, error: null })
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe('sign-in route', () => {
  it('offers Google and email/password, and submits credentials', async () => {
    renderAppAt('/sign-in', { viewer: ANONYMOUS_VIEWER })

    expect(await screen.findByRole('button', { name: /google/i })).toBeTruthy()

    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }))

    await waitFor(() =>
      expect(signInEmail).toHaveBeenCalledWith({ email: 'a@b.com', password: 'password123' }),
    )
  })

  it('passes the redirect target to the Google callback', async () => {
    renderAppAt('/sign-in?redirect=%2Fsaved', { viewer: ANONYMOUS_VIEWER })

    await userEvent.click(await screen.findByRole('button', { name: /google/i }))

    expect(signInSocial).toHaveBeenCalledWith({ provider: 'google', callbackURL: '/saved' })
  })

  it('falls back to browse when no redirect is given', async () => {
    renderAppAt('/sign-in', { viewer: ANONYMOUS_VIEWER })

    await userEvent.click(await screen.findByRole('button', { name: /google/i }))

    expect(signInSocial).toHaveBeenCalledWith({ provider: 'google', callbackURL: '/browse' })
  })

  it('ignores an off-site redirect rather than following it', async () => {
    renderAppAt('/sign-in?redirect=https%3A%2F%2Fevil.example.com', { viewer: ANONYMOUS_VIEWER })

    await userEvent.click(await screen.findByRole('button', { name: /google/i }))

    await waitFor(() =>
      expect(signInSocial).toHaveBeenCalledWith({ provider: 'google', callbackURL: '/browse' }),
    )
  })

  it('switches to sign-up and creates an account', async () => {
    renderAppAt('/sign-in', { viewer: ANONYMOUS_VIEWER })

    await userEvent.click(await screen.findByRole('button', { name: /create one/i }))
    await userEvent.type(screen.getByLabelText(/name/i), 'A B')
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() =>
      expect(signUpEmail).toHaveBeenCalledWith({
        email: 'a@b.com',
        password: 'password123',
        name: 'A B',
      }),
    )
  })

  it('surfaces a rejected sign-in instead of navigating', async () => {
    signInEmail.mockResolvedValue({ data: null, error: { message: 'Invalid email or password.' } })
    renderAppAt('/sign-in', { viewer: ANONYMOUS_VIEWER })

    await userEvent.type(await screen.findByLabelText(/email/i), 'a@b.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong-password')
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }))

    expect((await screen.findByRole('alert')).textContent).toContain('Invalid email or password.')
  })
})
