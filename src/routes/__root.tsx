import { useEffect, type ReactNode } from 'react'
import { HeadContent, Scripts, createRootRouteWithContext } from '@tanstack/react-router'

import { App } from '../App'
import { StoreProvider } from '../store/store'
import type { AppRouterContext } from '../router/context'
import '../index.css'

function DefaultNotFound() {
  return (
    <section style={{ padding: '40px 24px 140px' }}>
      <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>Page not found</h1>
      <p style={{ marginTop: 10, color: '#6b7280', lineHeight: 1.6 }}>
        This page doesn&apos;t exist yet. Try heading back to Browse.
      </p>
    </section>
  )
}

function RootRouteComponent() {
  const { backend, viewerId, mockUser, moderatorId } = Route.useRouteContext()

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return

    void navigator.serviceWorker.register('/sw.js')
  }, [])

  return (
    <RootDocument>
      <StoreProvider backend={backend} viewerId={viewerId} mockUser={mockUser} moderatorId={moderatorId}>
        <App />
      </StoreProvider>
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

export const Route = createRootRouteWithContext<AppRouterContext>()({
  head: () => ({
    meta: [
      { title: 'Pet Buddies MV' },
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1' },
      { name: 'theme-color', content: '#F7F8FA' },
      { name: 'color-scheme', content: 'light' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      { name: 'apple-mobile-web-app-title', content: 'Pet Buddies' },
    ],
    links: [
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'apple-touch-icon', href: '/icon.svg' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Quicksand:wght@500;600;700&family=Hanken+Grotesk:wght@400;500;600;700&display=swap',
      },
    ],
  }),
  component: RootRouteComponent,
  notFoundComponent: DefaultNotFound,
})
