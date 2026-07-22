import { createServerFn } from '@tanstack/react-start'

import type { ListClinicsResponse } from '../../server/contracts/api'
import { createServerBackend } from '../../server/runtime/server-backend'

/** Reads the clinic directory through the durable backend on the server. */
export const fetchClinics = createServerFn({ method: 'POST' }).handler(async (): Promise<ListClinicsResponse> => {
  const backend = await createServerBackend()
  const result = await backend.listClinics()
  if (!result.ok) throw new Error(result.error.message)
  return result.data
})
