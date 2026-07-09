import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { renderAppAt } from '../../helpers/render-app'
import { DESKTOP_VIEWPORT, PHONE_VIEWPORT, setViewport } from '../../helpers/viewport'

function renderAt(path: string) {
  return renderAppAt(path)
}

// 'Simba' (pending-simba) ships as a seeded pending listing in the store's
// review queue, so no extra seeding is needed.

beforeAll(() => {
  window.scrollTo = vi.fn()
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  setViewport(PHONE_VIEWPORT)
})

describe('desktop review queue', () => {
  it('opens from the rail as a wide dialog and approves a pending listing', async () => {
    const user = userEvent.setup()
    setViewport(DESKTOP_VIEWPORT)
    renderAt('/browse')

    await screen.findByText('Find a buddy')
    await user.click(screen.getByRole('button', { name: 'Review queue' }))

    const dialog = await screen.findByRole('dialog', { name: 'Review queue' })
    expect(within(dialog).getByText('Simba')).toBeTruthy()

    await user.click(within(dialog).getByRole('button', { name: 'Approve and publish Simba' }))

    await waitFor(() => {
      expect(within(dialog).queryByText('Simba')).toBeNull()
    })
  })

  it('keeps the full-screen presentation on phone widths', async () => {
    const user = userEvent.setup()
    renderAt('/browse')

    await screen.findByText('Find a buddy')
    await user.click(screen.getByRole('button', { name: 'Review queue' }))

    expect(await screen.findByText('Simba')).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('button', { name: /Done/ })).toBeTruthy()
  })
})
