import { useEffect, useMemo, type ReactNode } from 'react'
import { HeadContent, Scripts, createRootRouteWithContext } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'

import { App } from '../App'
import { StoreProvider } from '../store/store'
import type { AppRouterContext } from '../router/context'
import { createServerFnMutationAdapter } from '../server/mutations/server-fn-mutation-adapter'
import { createServerFnUploadMedia } from '../server/mutations/server-fn-upload'
import { createListing, uploadMedia } from '../features/listings/listings.functions'
import { toggleSavedListing } from '../features/saved/saved.functions'
import { createInquiry } from '../features/inquiries/inquiries.functions'
import { createReport } from '../features/reports/reports.functions'
import { updateListingLifecycle } from '../features/moderation/moderation.functions'
import { fetchAppShell } from '../features/app-shell/app-shell.functions'
// Global CSS as a stable head-link (?url) rather than a side-effect import.
// A side-effect import becomes a React-19 precedence-managed <link>, which gets
// dropped on refresh when hydration reconciles the head — leaving the app
// unstyled. A declared head link is rendered identically on server and client.
import appCss from '../index.css?url'

const serverFunctionMutations = createServerFnMutationAdapter({
  toggleSavedListing,
  createInquiry,
  createListing,
  createReport,
  updateListingLifecycle,
  uploadMedia: createServerFnUploadMedia(uploadMedia),
})

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
  const { queryClient, backend, mutations, viewerId, mockUser, moderatorId } = Route.useRouteContext()

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return

    void navigator.serviceWorker.register('/sw.js')
  }, [])

  const storeMutations = useMemo(() => mutations ?? serverFunctionMutations, [mutations])
  // NOTE: the store's app-shell reconcile is being migrated to the TanStack Query
  // cache (ADR 0009). It remains here until the remaining screens read durable
  // data through Query; the moderator Review queue already reads Query.
  const hydrate = useMemo(
    () => (backend ? (id: string) => backend.hydrateAppShell({ viewerId: id }) : () => fetchAppShell()),
    [backend],
  )

  return (
    <RootDocument>
      <QueryClientProvider client={queryClient}>
        <StoreProvider
          viewerId={viewerId}
          mockUser={mockUser}
          moderatorId={moderatorId}
          mutations={storeMutations}
          hydrate={hydrate}
        >
          <App />
        </StoreProvider>
      </QueryClientProvider>
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
      { rel: 'stylesheet', href: appCss },
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
