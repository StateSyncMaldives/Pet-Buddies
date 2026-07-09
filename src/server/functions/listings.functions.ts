import { createServerFn } from '@tanstack/react-start'

import { toTagSlug } from '../../router/browse-search'
import { createServerBackend } from '../runtime/server-backend'
import type { BrowseListingsResponse, Species } from '../contracts/api'

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
