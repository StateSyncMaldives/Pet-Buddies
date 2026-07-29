import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderAppAt } from '../../../helpers/render-app'
import { ANONYMOUS_VIEWER, TEST_MODERATOR_VIEWER, TEST_VIEWER } from '../../../helpers/viewers'
import type { Viewer } from '../../../../src/server/auth/resolve-viewer'

const listUsers = vi.fn()
const listOrganizations = vi.fn()
const setUserRole = vi.fn()
const banUser = vi.fn()
const verifyOrganization = vi.fn()

vi.mock('../../../../src/features/auth/admin.functions', () => ({
  listUsers: (...args: unknown[]) => listUsers(...args),
  listOrganizations: (...args: unknown[]) => listOrganizations(...args),
  setUserRole: (...args: unknown[]) => setUserRole(...args),
  banUser: (...args: unknown[]) => banUser(...args),
  unbanUser: vi.fn(),
  verifyOrganization: (...args: unknown[]) => verifyOrganization(...args),
  unverifyOrganization: vi.fn(),
}))

const ADMIN_VIEWER = { ...TEST_VIEWER, role: 'admin' as const }

beforeEach(() => {
  listUsers.mockReset().mockResolvedValue({
    items: [
      {
        id: 'user-1',
        email: 'someone@petbuddies.mv',
        displayName: 'Someone',
        role: 'user',
        banned: false,
        banReason: null,
        banExpiresAt: null,
        emailVerified: true,
      },
    ],
  })
  listOrganizations.mockReset().mockResolvedValue({
    items: [{ id: 'org-1', slug: 'org-1', name: 'Org One', isVerified: false, verifiedAt: null }],
  })
  setUserRole.mockReset().mockResolvedValue({ user: {} })
  banUser.mockReset().mockResolvedValue({ user: {} })
  verifyOrganization.mockReset().mockResolvedValue({ organization: {} })
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe('/admin/users guard', () => {
  it('sends an anonymous visitor to sign-in', async () => {
    const router = renderAppAt('/admin/users', { viewer: ANONYMOUS_VIEWER })

    await waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'))
    expect(listUsers).not.toHaveBeenCalled()
  })

  it('turns a plain user away', async () => {
    const router = renderAppAt('/admin/users', { viewer: TEST_VIEWER })

    await waitFor(() => expect(router.state.location.pathname).not.toBe('/admin/users'))
    expect(listUsers).not.toHaveBeenCalled()
  })

  it('turns a moderator away — moderating listings is not administering people', async () => {
    const router = renderAppAt('/admin/users', { viewer: TEST_MODERATOR_VIEWER })

    await waitFor(() => expect(router.state.location.pathname).not.toBe('/admin/users'))
    expect(listUsers).not.toHaveBeenCalled()
  })

  it('lets an administrator through', async () => {
    const router = renderAppAt('/admin/users', { viewer: ADMIN_VIEWER })

    expect(await screen.findByText('Someone')).toBeTruthy()
    expect(router.state.location.pathname).toBe('/admin/users')
  })
})

describe('/admin/users actions', () => {
  it('changes a global role', async () => {
    renderAppAt('/admin/users', { viewer: ADMIN_VIEWER })

    const select = await screen.findByLabelText(/role for someone/i)
    await userEvent.selectOptions(select, 'moderator')

    await waitFor(() =>
      expect(setUserRole).toHaveBeenCalledWith({ data: { userId: 'user-1', role: 'moderator' } }),
    )
  })

  it('bans a user', async () => {
    renderAppAt('/admin/users', { viewer: ADMIN_VIEWER })

    await userEvent.click(await screen.findByRole('button', { name: /ban someone/i }))

    await waitFor(() => expect(banUser).toHaveBeenCalledWith({ data: { userId: 'user-1' } }))
  })

  it('verifies an organization', async () => {
    renderAppAt('/admin/users', { viewer: ADMIN_VIEWER })

    await userEvent.click(await screen.findByRole('button', { name: /verify org one/i }))

    await waitFor(() =>
      expect(verifyOrganization).toHaveBeenCalledWith({ data: { organizationId: 'org-1' } }),
    )
  })

  it('surfaces a rejected action', async () => {
    setUserRole.mockRejectedValue(new Error('Promote another administrator first.'))
    renderAppAt('/admin/users', { viewer: ADMIN_VIEWER })

    await userEvent.selectOptions(await screen.findByLabelText(/role for someone/i), 'admin')

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Promote another administrator first.',
    )
  })
})

/**
 * The guard must resolve the viewer freshly rather than trusting router
 * context. Returning from Google boots an already-cached SPA shell, so the
 * context can still hold the pre-sign-in anonymous viewer — which bounced
 * freshly signed-in administrators back to /sign-in.
 */
describe('/admin/users guard with a stale router context', () => {
  const adminViewer: Viewer = { ...TEST_VIEWER, role: 'admin' }

  it('admits an administrator even when the context is still anonymous', async () => {
    const router = renderAppAt('/admin/users', {
      viewer: ANONYMOUS_VIEWER,
      loadViewer: async () => adminViewer,
    })

    expect(await screen.findByText('Someone')).toBeTruthy()
    expect(router.state.location.pathname).toBe('/admin/users')
  })

  it('still turns away a non-admin whose context wrongly claims admin', async () => {
    const router = renderAppAt('/admin/users', {
      viewer: adminViewer,
      loadViewer: async () => TEST_VIEWER,
    })

    await waitFor(() => expect(router.state.location.pathname).not.toBe('/admin/users'))
    expect(listUsers).not.toHaveBeenCalled()
  })
})
