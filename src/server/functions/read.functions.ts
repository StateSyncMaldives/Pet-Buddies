import { createServerFn } from '@tanstack/react-start'

import type {
  GetListingDetailResponse,
  GetYouReadModelResponse,
  ListClinicsResponse,
  ListSavedListingsResponse,
} from '../contracts/api'
import { createDemoSession } from '../runtime/app-session'
import { createServerBackend } from '../runtime/server-backend'

/**
 * Read server functions. In the SPA the client's loaders run in the browser,
 * which cannot reach D1 directly, so they read through these — each resolves
 * the durable backend on the server. Viewer-scoped reads use the demo session's
 * viewer id server-side. See ADR 0008.
 */

export const fetchSavedListings = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ListSavedListingsResponse> => {
    const backend = await createServerBackend()
    const result = await backend.listSavedListings({ viewerId: createDemoSession().viewerId })
    if (!result.ok) throw new Error(result.error.message)
    return result.data
  },
)

export const fetchYouReadModel = createServerFn({ method: 'GET' }).handler(
  async (): Promise<GetYouReadModelResponse> => {
    const backend = await createServerBackend()
    const result = await backend.getYouReadModel({ viewerId: createDemoSession().viewerId })
    if (!result.ok) throw new Error(result.error.message)
    return result.data
  },
)

export const fetchClinics = createServerFn({ method: 'GET' }).handler(async (): Promise<ListClinicsResponse> => {
  const backend = await createServerBackend()
  const result = await backend.listClinics()
  if (!result.ok) throw new Error(result.error.message)
  return result.data
})

export const fetchListingDetail = createServerFn({ method: 'GET' })
  .validator((slugOrId: string) => slugOrId)
  .handler(async ({ data }): Promise<GetListingDetailResponse> => {
    const backend = await createServerBackend()
    const result = await backend.getListingDetail({ slugOrId: data })
    if (!result.ok) throw new Error(result.error.message)
    return result.data
  })
