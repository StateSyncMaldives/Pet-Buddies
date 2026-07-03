import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AppRouterProvider } from './router'
import { createAppRuntime } from './server/runtime/app-session'

const runtime = createAppRuntime()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRouterProvider
      backend={runtime.backend}
      viewerId={runtime.session.viewerId}
      mockUser={runtime.session.mockUser}
      moderatorId={runtime.session.moderatorId}
    />
  </StrictMode>,
)
