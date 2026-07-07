import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { InstallSheet } from '../../../src/screens/InstallSheet'
import { useStore } from '../../../src/store/store'
import { useRouterState } from '@tanstack/react-router'

vi.mock('@tanstack/react-router', () => ({
  useRouterState: vi.fn(),
}))

vi.mock('../../../src/store/store', () => ({
  useStore: vi.fn(),
}))

const mockUseStore = vi.mocked(useStore)
const mockUseRouterState = useRouterState as unknown as {
  mockImplementation: (impl: (opts?: { select?: (state: { location: { pathname: Pathname } }) => unknown }) => unknown) => void
}

type Pathname = '/browse' | '/report'
type Tab = 'browse' | 'report'

function renderInstallSheet({ pathname, tab }: { pathname: Pathname; tab: Tab }) {
  mockUseRouterState.mockImplementation((opts) =>
    opts?.select ? opts.select({ location: { pathname } } as never) : ({ location: { pathname } } as never),
  )

  mockUseStore.mockReturnValue({
    state: {
      onboarded: true,
      installed: false,
      installDismissed: false,
      overlay: null,
      tab,
    },
    installAdd: vi.fn(),
    installDismiss: vi.fn(),
  } as unknown as ReturnType<typeof useStore>)

  render(<InstallSheet />)
}

describe('install sheet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('shows on the browse route even when the store tab is stale', () => {
    renderInstallSheet({ pathname: '/browse', tab: 'report' })

    expect(screen.getByRole('button', { name: 'Add to Home Screen' })).toBeTruthy()
  })

  it('stays hidden on non-browse routes even when the store tab says browse', () => {
    renderInstallSheet({ pathname: '/report', tab: 'browse' })

    expect(screen.queryByRole('button', { name: 'Add to Home Screen' })).toBeNull()
  })
})
