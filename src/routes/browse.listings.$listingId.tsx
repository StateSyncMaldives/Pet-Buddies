import { useEffect } from 'react'
import { createFileRoute, notFound } from '@tanstack/react-router'

import { useStore } from '../store/store'
import { useViewportMode } from '../layout/viewport-mode'
import { mapListingDetailToListing } from '../store/view-model-mappers'
import { ListingDetailSurface } from '../screens/ListingDetailSurface'
import { validateBrowseSearch } from '../router/browse-search'

export const Route = createFileRoute('/browse/listings/$listingId')({
  validateSearch: validateBrowseSearch,
  loader: ({ context, params }) => {
    const result = context.backend.getListingDetail({ slugOrId: params.listingId })
    if (!result.ok) throw notFound()
    return result.data.item
  },
  component: BrowseDetailRoute,
})

function BrowseDetailRoute() {
  const { listingId } = Route.useParams()
  const detail = Route.useLoaderData()
  const desktop = useViewportMode() === 'desktop'
  const { openDetail, closeDetail } = useStore()

  // Phone/column keep the store-driven overlay presentation (ADR 0002);
  // desktop renders the detail surface from route data instead (ADR 0004).
  // Note: below desktop the loader result is unused (the overlay reads the
  // store) — fold the overlay onto route data before the backend goes remote,
  // or every phone detail view pays for a discarded fetch.
  useEffect(() => {
    if (desktop) return
    openDetail(listingId)
    return () => closeDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId, desktop])

  if (!desktop) return null

  return <ListingDetailSurface listing={mapListingDetailToListing(detail)} />
}
