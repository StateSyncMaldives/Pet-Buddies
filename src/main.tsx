import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AppRouterProvider } from './router'
import { createAppRuntime } from './server/runtime/app-session'
import { createServerFnMutationAdapter } from './server/mutations/server-fn-mutation-adapter'
import { createServerFnUploadMedia } from './server/mutations/server-fn-upload'
import {
  createInquiry,
  createListing,
  createReport,
  toggleSavedListing,
  updateListingLifecycle,
  uploadMedia,
} from './server/functions/mutations.functions'

const runtime = createAppRuntime()

// Client writes route through Start server functions so they land on the
// server's durable backend, not this tab's in-memory instance. See ADR 0008.
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
      backend={runtime.backend}
      mutations={mutations}
      viewerId={runtime.session.viewerId}
      mockUser={runtime.session.mockUser}
      moderatorId={runtime.session.moderatorId}
    />
  </StrictMode>,
)
