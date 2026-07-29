import { createServerFn } from '@tanstack/react-start'

import { toTagSlug } from '../../router/browse-search'
import { requireOrgRole, requireViewer } from '../../server/auth/guards'
import { resolveRequestViewer } from '../../server/auth/request-viewer'
import type { Viewer } from '../../server/auth/resolve-viewer'
import {
  createListingInputSchema,
  type CreateListingMutationInput,
} from '../../server/mutations/mutation-schemas'
import { createDurableServerMutationAdapter } from '../../server/mutations/durable-mutation-adapter'
import type { AppMutationAdapter } from '../../server/mutations/mutation-adapter'
import type { PetBuddiesDrizzleDatabase } from '../../server/infra/db/d1-drizzle'
import { resolveRequestDatabase } from '../../server/infra/db/request-database'
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

export const getBrowseListings = createServerFn({ method: 'POST' })
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

export const fetchListingDetail = createServerFn({ method: 'POST' })
  .validator((slugOrId: string) => slugOrId)
  .handler(async ({ data }): Promise<GetListingDetailResponse> => {
    const backend = await createServerBackend()
    const result = await backend.getListingDetail({ slugOrId: data })
    if (!result.ok) throw new Error(result.error.message)
    return result.data
  })

/**
 * Creating a listing requires a signed-in viewer. Listing it *under an
 * organization* additionally requires the `listing_manager` role in that
 * organization, so a member cannot publish in the organization's name.
 */
export async function createListingForViewer(
  deps: { viewer: Viewer; mutations?: AppMutationAdapter; database?: PetBuddiesDrizzleDatabase },
  input: CreateListingMutationInput,
) {
  requireViewer(deps.viewer)

  const organizationId = input.request.organizationId
  if (organizationId) {
    const database = deps.database ?? (await resolveRequestDatabase())
    await requireOrgRole({ database }, deps.viewer, organizationId, 'listing_manager')
  }

  const mutations = deps.mutations ?? (await createDurableServerMutationAdapter(deps.viewer))
  return mutations.createListing(input)
}

export const createListing = createServerFn({ method: 'POST' })
  .validator(createListingInputSchema)
  .handler(async ({ data }) => createListingForViewer({ viewer: await resolveRequestViewer() }, data))

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
