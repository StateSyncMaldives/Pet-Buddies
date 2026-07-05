// Test-side seam for viewport-driven behavior: widen/narrow the happy-dom
// viewport and notify subscribers the same way a real browser resize would.
export function setViewport(width: number, height = 844): void {
  const happyDOM = (window as unknown as { happyDOM?: { setViewport?: (v: { width: number; height: number }) => void } })
    .happyDOM
  if (happyDOM?.setViewport) {
    happyDOM.setViewport({ width, height })
  } else {
    Object.assign(window, { innerWidth: width, innerHeight: height })
  }
  window.dispatchEvent(new Event('resize'))
}

export const PHONE_VIEWPORT = 390
export const COLUMN_VIEWPORT = 700
export const DESKTOP_VIEWPORT = 1280
