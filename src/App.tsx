import { useEffect } from 'react'
import { Outlet, useRouterState } from '@tanstack/react-router'
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
import { useStore } from './store/store'
import { getListingIdFromDetailPath } from './router/paths'

function getDetailIdFromPathname(pathname: string): string | null {
  return getListingIdFromDetailPath(pathname)
}

function useDetailRouteSync() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { state, listings, openDetail, closeDetail } = useStore()

  useEffect(() => {
    const detailId = getDetailIdFromPathname(pathname)
    if (detailId && listings.some((listing) => listing.id === detailId)) {
      if (state.overlay !== 'detail' || state.detailId !== detailId) openDetail(detailId)
      return
    }

    if (state.overlay === 'detail') closeDetail()
  }, [pathname, listings, openDetail, closeDetail, state.overlay, state.detailId])
}

export function App() {
  useDetailRouteSync()

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
