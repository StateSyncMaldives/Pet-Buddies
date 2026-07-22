import { createServerFn } from '@tanstack/react-start'

import type { GetYouReadModelResponse } from '../../server/contracts/api'
import { createDemoSession } from '../../server/runtime/demo-session'
import { createServerBackend } from '../../server/runtime/server-backend'

/**
 * Profile ("You") server function. The SPA loader reads the viewer's read model
 * — sent inquiries and owned listings — through this, resolved against the
 * durable backend server-side. See ADR 0008.
 */

export const fetchYouReadModel = createServerFn({ method: 'POST' }).handler(
  async (): Promise<GetYouReadModelResponse> => {
    const backend = await createServerBackend()
    const result = await backend.getYouReadModel({ viewerId: createDemoSession().viewerId })
    if (!result.ok) throw new Error(result.error.message)
    return result.data
  },
)
