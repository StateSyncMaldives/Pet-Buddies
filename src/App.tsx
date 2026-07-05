import { Outlet } from '@tanstack/react-router'
import { BottomNav } from './components/BottomNav'
import { RailNav } from './components/RailNav'
import { Toast } from './components/Toast'
import { useViewportMode } from './layout/viewport-mode'
import { DetailOverlay } from './screens/DetailOverlay'
import { AuthOverlay } from './screens/AuthOverlay'
import { AddOverlay } from './screens/AddOverlay'
import { InquiryOverlay } from './screens/InquiryOverlay'
import { ModOverlay } from './screens/ModOverlay'
import { Onboarding } from './screens/Onboarding'
import { InstallSheet } from './screens/InstallSheet'

export function App() {
  const mode = useViewportMode()
  const desktop = mode === 'desktop'

  return (
    <div className="pb-stage" data-mode={mode}>
      {desktop && <RailNav />}

      <div className="pb-phone">
        <div className="pbscroll pb-scroll">
          <Outlet />
        </div>

        {!desktop && <BottomNav />}

        <DetailOverlay />
        <AddOverlay />
        <AuthOverlay />
        <InquiryOverlay />
        <ModOverlay />
        {mode === 'phone' && (
          <>
            <InstallSheet />
            <Onboarding />
          </>
        )}

        <Toast />
      </div>
    </div>
  )
}
