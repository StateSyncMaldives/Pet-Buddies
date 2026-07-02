import { Outlet } from '@tanstack/react-router'
import { StatusBar } from './components/StatusBar'
import { BottomNav } from './components/BottomNav'
import { Toast } from './components/Toast'
import { DetailOverlay } from './screens/DetailOverlay'
import { AuthOverlay } from './screens/AuthOverlay'
import { AddOverlay } from './screens/AddOverlay'
import { InquiryOverlay } from './screens/InquiryOverlay'
import { ModOverlay } from './screens/ModOverlay'
import { Onboarding } from './screens/Onboarding'
import { InstallSheet } from './screens/InstallSheet'

export function App() {
  return (
    <div className="pb-stage">
      <div className="pb-phone">
        <StatusBar />

        <div className="pbscroll pb-scroll">
          <Outlet />
        </div>

        <BottomNav />

        <DetailOverlay />
        <AddOverlay />
        <AuthOverlay />
        <InquiryOverlay />
        <ModOverlay />
        <InstallSheet />
        <Onboarding />

        <Toast />
      </div>
    </div>
  )
}
