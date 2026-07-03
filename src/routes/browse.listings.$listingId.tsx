import { useEffect } from 'react'
import { createFileRoute, notFound } from '@tanstack/react-router'

import { useStore } from '../store/store'
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
  const { openDetail, closeDetail } = useStore()

  useEffect(() => {
    openDetail(listingId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId])

  useEffect(() => {
    return () => closeDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
