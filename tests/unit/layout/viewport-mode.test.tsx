import { cleanup, render, screen } from '@testing-library/react'
import { act } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { useViewportMode } from '../../../src/layout/viewport-mode'
import { COLUMN_VIEWPORT, DESKTOP_VIEWPORT, PHONE_VIEWPORT, setViewport } from '../../helpers/viewport'

function ModeProbe() {
  return <div data-testid="mode">{useViewportMode()}</div>
}

afterEach(() => {
  cleanup()
  setViewport(PHONE_VIEWPORT)
})

describe('useViewportMode', () => {
  it('reports phone mode at the default test viewport (390px)', () => {
    render(<ModeProbe />)
    expect(screen.getByTestId('mode').textContent).toBe('phone')
  })

  it('reports column mode between 441 and 900px', () => {
    setViewport(COLUMN_VIEWPORT)
    render(<ModeProbe />)
    expect(screen.getByTestId('mode').textContent).toBe('column')
  })

  it('reports desktop mode above 900px', () => {
    setViewport(DESKTOP_VIEWPORT)
    render(<ModeProbe />)
    expect(screen.getByTestId('mode').textContent).toBe('desktop')
  })

  it('tracks live viewport resizes', () => {
    render(<ModeProbe />)
    expect(screen.getByTestId('mode').textContent).toBe('phone')

    act(() => setViewport(DESKTOP_VIEWPORT))
    expect(screen.getByTestId('mode').textContent).toBe('desktop')

    act(() => setViewport(PHONE_VIEWPORT))
    expect(screen.getByTestId('mode').textContent).toBe('phone')
  })
})
