import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { renderAppAt } from '../../../helpers/render-app'
import type { Viewer } from '../../../../src/server/auth/resolve-viewer'
import { TEST_VIEWER } from '../../../helpers/viewers'

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
})

/**
 * The reported bug, from the owner's side: someone applies to adopt their pet
 * and they never see it. These drive the real read model through the injected
 * backend, so an inquiry has to travel sender -> recipient for them to pass.
 */
describe('You / Received', () => {
  /**
   * Seed listing 'coco' is listed by "Aishath" (src/data/seed.ts), so it is
   * user-owned and its inquiries are addressed to `user-aishath` rather than to
   * an organization. Rendering AS that owner is what makes this the owner's view.
   */
  const COCO_OWNER: Viewer = { ...TEST_VIEWER, id: 'user-aishath', displayName: 'Aishath' }

  /** "Ahmed" lists another seed pet, so the prototype knows this identity. */
  const SENDER = { id: 'user-ahmed', displayName: 'Ahmed', email: 'ahmed@example.com' }

  function renderOwnerWithInquiry(viewer: Viewer) {
    return renderAppAt('/you?view=received', {
      viewer,
      setupRuntime: ({ backend }) => {
        void backend.createInquiry({
          viewerId: SENDER.id,
          request: { listingId: 'coco', message: 'Is Coco good with children?' },
        })
      },
    })
  }

  it('explains the empty state when nobody has asked yet', async () => {
    renderAppAt('/you?view=received', { viewer: TEST_VIEWER })

    expect(
      await screen.findByText(/when someone applies to adopt one of your pets/i),
    ).toBeTruthy()
  })

  it('is reachable from the tab strip', async () => {
    const router = renderAppAt('/you', { viewer: TEST_VIEWER })

    await userEvent.click(await screen.findByRole('button', { name: 'Received' }))

    expect(router.state.location.search).toMatchObject({ view: 'received' })
  })

  it('keeps Sent and Received as separate tabs', async () => {
    renderAppAt('/you', { viewer: TEST_VIEWER })

    // "Inquiries" was ambiguous once both directions exist.
    expect(await screen.findByRole('button', { name: 'Sent' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Received' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Inquiries' })).toBeNull()
  })

  it('shows the message to the listing owner who received it', async () => {
    renderOwnerWithInquiry(COCO_OWNER)

    // The bug, from the owner's side: this text existed in D1 and was
    // unreachable from every screen in the app.
    expect(await screen.findByText(/is coco good with children\?/i)).toBeTruthy()
    expect(screen.getByText(/1 inquiry received/i)).toBeTruthy()
  })

  it('names who sent it', async () => {
    renderOwnerWithInquiry(COCO_OWNER)

    expect(await screen.findByText(`From ${SENDER.displayName}`)).toBeTruthy()
  })

  it('offers the sender address, since there is no in-app reply', async () => {
    renderOwnerWithInquiry(COCO_OWNER)

    const contact = await screen.findByRole('link', { name: SENDER.email })
    expect(contact.getAttribute('href')).toContain(`mailto:${SENDER.email}`)
  })

  it('does not show it to anyone who is not the recipient', async () => {
    // Same inquiry, but viewed by someone who does not own 'coco'.
    renderOwnerWithInquiry(TEST_VIEWER)

    expect(
      await screen.findByText(/when someone applies to adopt one of your pets/i),
    ).toBeTruthy()
    expect(screen.queryByText(/is coco good with children\?/i)).toBeNull()
  })
})

/**
 * A sent inquiry is about someone else's listing, so resolving it against the
 * viewer's own listings always missed — and the fallback rendered every card
 * as a cat regardless of species.
 */
describe('You / Sent', () => {
  it('still lists inquiries the viewer sent', async () => {
    renderAppAt('/you?view=sent', {
      viewer: TEST_VIEWER,
      setupRuntime: ({ backend }) => {
        void backend.createInquiry({
          viewerId: TEST_VIEWER.id,
          request: { listingId: 'coco', message: 'Could we meet Coco?' },
        })
      },
    })

    expect(await screen.findByText(/could we meet coco\?/i)).toBeTruthy()
  })

  it('is where the legacy ?view=inquiries link lands', async () => {
    const router = renderAppAt('/you?view=inquiries', { viewer: TEST_VIEWER })

    await screen.findByRole('button', { name: 'Sent' })
    expect(router.state.location.search).toMatchObject({ view: 'sent' })
  })
})
