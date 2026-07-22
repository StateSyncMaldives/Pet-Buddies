import { StrictMode, startTransition } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { StartClient } from '@tanstack/react-start/client'

// Canonical TanStack Start client entry: hydrate the whole document that the
// root route's RootDocument renders (<html>…</html>). The previous
// createRoot(document.getElementById('root')) pattern mounted that <html> inside
// index.html's #root div, which broke hydration on every load (and cascaded
// into dropped CSS and store thrash). index.css and the demo session context are
// wired through __root.tsx and the router's default context.
startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>,
  )
})
