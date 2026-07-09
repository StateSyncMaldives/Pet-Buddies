import { createServerFn } from '@tanstack/react-start'

import {
  createInquiryInputSchema,
  createListingInputSchema,
  createReportInputSchema,
  toggleSavedListingInputSchema,
  updateListingLifecycleInputSchema,
} from '../mutations/mutation-schemas'
import { createRuntimeMutationAdapter } from '../mutations/mutation-adapter'
import { parseMediaUploadFormData } from '../mutations/media-upload-form'
import { createUploadMediaUseCase } from '../domain/media/upload-media'
import { getWorkerEnv } from '../infra/cloudflare/worker-env'
import { resolveWorkerMediaStore } from '../infra/media/worker-media-store'
import { createDemoSession, DEMO_MODERATOR_ID } from '../runtime/app-session'
import { createServerBackend } from '../runtime/server-backend'

/**
 * Server-side mutation adapter over the durable backend (D1 when available,
 * in-memory fallback otherwise). Saved-listing toggles persist to D1; the other
 * writes currently delegate to the in-memory fallback until durablised.
 */
async function createDurableServerMutationAdapter() {
  const backend = await createServerBackend()
  const session = createDemoSession()
  return createRuntimeMutationAdapter({
    backend,
    viewerId: session.viewerId,
    moderatorId: session.moderatorId ?? DEMO_MODERATOR_ID,
  })
}

export const toggleSavedListing = createServerFn({ method: 'POST' })
  .validator(toggleSavedListingInputSchema)
  .handler(async ({ data }) => {
    return (await createDurableServerMutationAdapter()).toggleSavedListing(data)
  })

export const createInquiry = createServerFn({ method: 'POST' })
  .validator(createInquiryInputSchema)
  .handler(async ({ data }) => {
    return (await createDurableServerMutationAdapter()).createInquiry(data)
  })

export const createListing = createServerFn({ method: 'POST' })
  .validator(createListingInputSchema)
  .handler(async ({ data }) => {
    return (await createDurableServerMutationAdapter()).createListing(data)
  })

export const createReport = createServerFn({ method: 'POST' })
  .validator(createReportInputSchema)
  .handler(async ({ data }) => {
    return (await createDurableServerMutationAdapter()).createReport(data)
  })

export const updateListingLifecycle = createServerFn({ method: 'POST' })
  .validator(updateListingLifecycleInputSchema)
  .handler(async ({ data }) => {
    return (await createDurableServerMutationAdapter()).updateListingLifecycle(data)
  })

export const uploadMedia = createServerFn({ method: 'POST' })
  .validator((formData: FormData) => formData)
  .handler(async ({ data }) => {
    const parsed = await parseMediaUploadFormData(data)
    if (parsed.ok === false) {
      return parsed
    }

    // Durable R2 store when running in the Worker; per-request demo store otherwise.
    const workerMediaStore = resolveWorkerMediaStore(await getWorkerEnv())
    if (workerMediaStore) {
      const upload = createUploadMediaUseCase({
        mediaObjects: workerMediaStore,
        generateId: () => `media-${crypto.randomUUID()}`,
      })
      return upload.execute(parsed.value)
    }

    return (await createDurableServerMutationAdapter()).uploadMedia(parsed.value)
  })
