import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import type { createAppRuntime } from '../../../src/server/runtime/app-session'
import { renderAppAt } from '../../helpers/render-app'
import { DESKTOP_VIEWPORT, PHONE_VIEWPORT, setViewport } from '../../helpers/viewport'

function renderAt(path: string, setupRuntime?: (runtime: ReturnType<typeof createAppRuntime>) => void) {
  return renderAppAt(path, { setupRuntime })
}

function seedPendingListing({ backend, session }: ReturnType<typeof createAppRuntime>) {
  const created = backend.createListing({
    actorUserId: session.viewerId,
    request: {
      species: 'cat',
      name: 'Nala',
      ageText: '2 years',
      sex: 'female',
      areaLabel: 'Maafannu, Male',
      story: 'Gentle indoor cat.',
      tagIds: [],
      imageObjectKeys: [],
    },
  })
  if (!created.ok) throw new Error('failed to seed pending listing')
}

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
    renderAt('/browse', seedPendingListing)

    await screen.findByText('Find a buddy')
    await user.click(screen.getByRole('button', { name: 'Review queue' }))

    const dialog = await screen.findByRole('dialog', { name: 'Review queue' })
    expect(within(dialog).getByText('Nala')).toBeTruthy()

    await user.click(within(dialog).getByRole('button', { name: 'Approve and publish Nala' }))

    await waitFor(() => {
      expect(within(dialog).queryByText('Nala')).toBeNull()
    })
  })

  it('keeps the full-screen presentation on phone widths', async () => {
    const user = userEvent.setup()
    renderAt('/browse', seedPendingListing)

    await screen.findByText('Find a buddy')
    await user.click(screen.getByRole('button', { name: 'Review queue' }))

    expect(await screen.findByText('Nala')).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('button', { name: /Done/ })).toBeTruthy()
  })
})
