import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { StoreProvider } from './store/store'
import { AppRouterProvider } from './router'
import { createAppRuntime } from './server/runtime/app-session'

const runtime = createAppRuntime()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider
      backend={runtime.backend}
      viewerId={runtime.session.viewerId}
      mockUser={runtime.session.mockUser}
      moderatorId={runtime.session.moderatorId}
    >
      <AppRouterProvider backend={runtime.backend} viewerId={runtime.session.viewerId} />
    </StoreProvider>
  </StrictMode>,
)
