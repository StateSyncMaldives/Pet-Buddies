import { Outlet } from '@tanstack/react-router'
import { BottomNav } from './components/BottomNav'
import { RailNav } from './components/RailNav'
import { Toast } from './components/Toast'
import { useViewportMode } from './layout/viewport-mode'
import { DetailOverlay } from './features/listings/DetailOverlay'
import { AuthOverlay } from './features/auth/AuthOverlay'
import { AddOverlay } from './features/onboarding/AddOverlay'
import { InquiryOverlay } from './features/inquiries/InquiryOverlay'
import { ModOverlay } from './features/moderation/ModOverlay'
import { Onboarding } from './features/onboarding/Onboarding'
import { InstallSheet } from './features/pwa/InstallSheet'

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
