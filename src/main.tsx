import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AppRouterProvider } from './router'
import { createAppRuntime } from './server/runtime/app-session'
import { createServerFnMutationAdapter } from './server/mutations/server-fn-mutation-adapter'
import { createServerFnUploadMedia } from './server/mutations/server-fn-upload'
import { createServerFnReadBackend } from './server/runtime/client-read-backend'
import {
  createListing,
  fetchListingDetail,
  getBrowseListings,
  uploadMedia,
} from './features/listings/listings.functions'
import { fetchSavedListings, toggleSavedListing } from './features/saved/saved.functions'
import { fetchYouReadModel } from './features/profile/profile.functions'
import { createInquiry } from './features/inquiries/inquiries.functions'
import { createReport } from './features/reports/reports.functions'
import { updateListingLifecycle } from './features/moderation/moderation.functions'
import { fetchClinics } from './features/clinics/clinics.functions'
import { fetchAppShell } from './features/app-shell/app-shell.functions'

const runtime = createAppRuntime()

// SPA: loaders run in the browser and cannot reach D1, so client reads are
// proxied through server functions to the durable backend. See ADR 0008.
const backend = createServerFnReadBackend({
  getBrowseListings,
  fetchListingDetail,
  fetchSavedListings,
  fetchYouReadModel,
  fetchClinics,
  fetchAppShell,
})

// Client writes route through Start server functions so they land on the
// server's durable backend, not this tab's in-memory instance.
const mutations = createServerFnMutationAdapter({
  toggleSavedListing,
  createInquiry,
  createListing,
  createReport,
  updateListingLifecycle,
  uploadMedia: createServerFnUploadMedia(uploadMedia),
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRouterProvider
      backend={backend}
      mutations={mutations}
      viewerId={runtime.session.viewerId}
      mockUser={runtime.session.mockUser}
      moderatorId={runtime.session.moderatorId}
    />
  </StrictMode>,
)
