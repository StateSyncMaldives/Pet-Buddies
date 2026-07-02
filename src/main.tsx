import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { StoreProvider } from './store/store'
import { AppRouterProvider } from './router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <AppRouterProvider />
    </StoreProvider>
  </StrictMode>,
)
