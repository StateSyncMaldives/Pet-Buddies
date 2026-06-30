import { useEffect, useRef } from 'react'
import { useStore } from './store/store'
import { petIdFromHash, PET_HASH } from './petLink'
import { StatusBar } from './components/StatusBar'
import { BottomNav } from './components/BottomNav'
import { Toast } from './components/Toast'
import { Browse } from './screens/Browse'
import { Saved } from './screens/Saved'
import { Report } from './screens/Report'
import { Vets } from './screens/Vets'
import { Inbox } from './screens/Inbox'
import { DetailOverlay } from './screens/DetailOverlay'
import { AuthOverlay } from './screens/AuthOverlay'
import { AddOverlay } from './screens/AddOverlay'
import { InquiryOverlay } from './screens/InquiryOverlay'
import { ModOverlay } from './screens/ModOverlay'
import { Onboarding } from './screens/Onboarding'
import { InstallSheet } from './screens/InstallSheet'

function ActiveTab() {
  const { state } = useStore()
  switch (state.tab) {
    case 'browse':
      return <Browse />
    case 'report':
      return <Report />
    case 'vets':
      return <Vets />
    case 'inbox':
      return <Inbox />
    case 'saved':
      return <Saved />
  }
}

/**
 * Two-way sync between the pet detail overlay and the URL hash, so pets are
 * deep-linkable / shareable and the device Back button closes the detail.
 */
function useDetailRouter() {
  const { state, listings, openDetail, closeDetail } = useStore()
  const detailId = state.overlay === 'detail' ? state.detailId : null
  const stateToUrlReady = useRef(false)

  // URL → state: on mount and on back/forward, open or close to match the hash.
  useEffect(() => {
    const fromUrl = () => {
      const id = petIdFromHash()
      if (id && listings.some((l) => l.id === id)) openDetail(id)
      else closeDetail()
    }
    fromUrl()
    window.addEventListener('popstate', fromUrl)
    window.addEventListener('hashchange', fromUrl)
    return () => {
      window.removeEventListener('popstate', fromUrl)
      window.removeEventListener('hashchange', fromUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // state → URL: reflect opens (push) / closes (back) into history. Skip the
  // first run so it can't wipe a deep-link hash before URL→state applies it.
  useEffect(() => {
    if (!stateToUrlReady.current) {
      stateToUrlReady.current = true
      return
    }
    if (detailId) {
      if (location.hash !== `#/pet/${detailId}`) {
        history.pushState(null, '', `#/pet/${detailId}`)
      }
    } else if (PET_HASH.test(location.hash)) {
      history.back()
    }
  }, [detailId])
}

export function App() {
  useDetailRouter()
  return (
    <div className="pb-stage">
      <div className="pb-phone">
        <StatusBar />

        {/* Main feed. On mobile the document scrolls (so Safari collapses its bar);
            on desktop this region scrolls inside the frame. */}
        <div className="pbscroll pb-scroll">
          <ActiveTab />
        </div>

        {/* Floating pill nav, pinned to the viewport (mobile) / frame (desktop). */}
        <BottomNav />

        {/* Stacked full-screen overlays (z-order: detail/add < auth < inquiry < mod < install < onboarding) */}
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
