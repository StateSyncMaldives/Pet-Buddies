import { createServerFn } from '@tanstack/react-start'

import { resolveRequestViewer } from '../../server/auth/request-viewer'
import type { Viewer } from '../../server/auth/resolve-viewer'
import type { GetYouReadModelResponse } from '../../server/contracts/api'
import type { AsyncAppBackend } from '../../server/runtime/app-backend'
import { createServerBackend } from '../../server/runtime/server-backend'

/**
 * Profile ("You") server function. The SPA loader reads the viewer's read model
 * — sent inquiries and owned listings — through this, resolved against the
 * durable backend server-side. See ADR 0008 / 0010.
 */

export async function getYouReadModelForViewer(deps: {
  viewer: Viewer
  backend?: AsyncAppBackend
}): Promise<GetYouReadModelResponse> {
  // An anonymous visitor has sent no inquiries and owns no listings. This is a
  // read, so it answers empty rather than refusing.
  if (deps.viewer.kind !== 'user') return { sentAdoptionInquiries: [], ownedListings: [] }

  const backend = deps.backend ?? (await createServerBackend())
  const result = await backend.getYouReadModel({ viewerId: deps.viewer.id })
  if (!result.ok) throw new Error(result.error.message)
  return result.data
}

export const fetchYouReadModel = createServerFn({ method: 'POST' }).handler(
  async (): Promise<GetYouReadModelResponse> =>
    getYouReadModelForViewer({ viewer: await resolveRequestViewer() }),
)
