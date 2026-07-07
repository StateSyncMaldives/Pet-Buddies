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
import { createAppRuntime, DEMO_MODERATOR_ID } from '../runtime/app-session'

function createDemoServerMutationAdapter() {
  const { backend, session } = createAppRuntime()
  return createRuntimeMutationAdapter({
    backend,
    viewerId: session.viewerId,
    moderatorId: session.moderatorId ?? DEMO_MODERATOR_ID,
  })
}

export const toggleSavedListing = createServerFn({ method: 'POST' })
  .validator(toggleSavedListingInputSchema)
  .handler(async ({ data }) => {
    return createDemoServerMutationAdapter().toggleSavedListing(data)
  })

export const createInquiry = createServerFn({ method: 'POST' })
  .validator(createInquiryInputSchema)
  .handler(async ({ data }) => {
    return createDemoServerMutationAdapter().createInquiry(data)
  })

export const createListing = createServerFn({ method: 'POST' })
  .validator(createListingInputSchema)
  .handler(async ({ data }) => {
    return createDemoServerMutationAdapter().createListing(data)
  })

export const createReport = createServerFn({ method: 'POST' })
  .validator(createReportInputSchema)
  .handler(async ({ data }) => {
    return createDemoServerMutationAdapter().createReport(data)
  })

export const updateListingLifecycle = createServerFn({ method: 'POST' })
  .validator(updateListingLifecycleInputSchema)
  .handler(async ({ data }) => {
    return createDemoServerMutationAdapter().updateListingLifecycle(data)
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

    return createDemoServerMutationAdapter().uploadMedia(parsed.value)
  })
