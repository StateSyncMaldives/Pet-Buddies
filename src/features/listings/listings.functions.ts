import { createServerFn } from '@tanstack/react-start'

import { toTagSlug } from '../../router/browse-search'
import { createListingInputSchema } from '../../server/mutations/mutation-schemas'
import { createDurableServerMutationAdapter } from '../../server/mutations/durable-mutation-adapter'
import { parseMediaUploadFormData } from '../../server/mutations/media-upload-form'
import { createUploadMediaUseCase } from '../../server/domain/media/upload-media'
import { getWorkerEnv } from '../../server/infra/cloudflare/worker-env'
import { resolveWorkerMediaStore } from '../../server/infra/media/worker-media-store'
import { createServerBackend } from '../../server/runtime/server-backend'
import type { BrowseListingsResponse, GetListingDetailResponse, Species } from '../../server/contracts/api'

interface BrowseListingsInput {
  species: Species
  query: string
  tags: string[]
}

export function validateBrowseListingsInput(input: unknown): BrowseListingsInput {
  if (!input || typeof input !== 'object') {
    return { species: 'cat', query: '', tags: [] }
  }

  const source = input as Record<string, unknown>
  return {
    species: source.species === 'bird' ? 'bird' : 'cat',
    query: typeof source.query === 'string' ? source.query.trim() : '',
    tags: Array.isArray(source.tags)
      ? [...new Set(source.tags.filter((tag): tag is string => typeof tag === 'string').map((tag) => tag.trim()).filter(Boolean))]
      : [],
  }
}

export const getBrowseListings = createServerFn({ method: 'GET' })
  .validator(validateBrowseListingsInput)
  .handler(async ({ data }): Promise<BrowseListingsResponse> => {
    const backend = await createServerBackend()
    const result = await backend.browseListings({
      query: {
        species: data.species,
        search: data.query || undefined,
        tagSlugs: data.tags.map(toTagSlug),
      },
    })

    if (!result.ok) {
      throw new Error(result.error.message)
    }

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

export const createListing = createServerFn({ method: 'POST' })
  .validator(createListingInputSchema)
  .handler(async ({ data }) => {
    return (await createDurableServerMutationAdapter()).createListing(data)
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
