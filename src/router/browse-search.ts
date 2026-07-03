import type { Species } from '../types'

export interface BrowseSearch {
  species: Species
  query: string
  tags: string[]
}

export interface BrowseSearchUrl {
  species?: Species
  q?: string
  tags?: string[]
}

const DEFAULT_SEARCH: BrowseSearch = {
  species: 'cat',
  query: '',
  tags: [],
}

function parseSpecies(value: unknown): Species {
  return value === 'bird' ? 'bird' : 'cat'
}

function parseQuery(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function parseTags(value: unknown): string[] {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? [value] : []
  return [...new Set(values.map((tag) => tag.trim()).filter(Boolean))]
}

export function toTagSlug(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, '-')
}

export function validateBrowseSearch(search: Record<string, unknown>): BrowseSearch {
  return {
    species: parseSpecies(search.species),
    query: parseQuery(search.q),
    tags: parseTags(search.tags),
  }
}

export function toBrowseSearchUrl(search: BrowseSearch): BrowseSearchUrl {
  return {
    species: search.species === DEFAULT_SEARCH.species ? undefined : search.species,
    q: search.query || undefined,
    tags: search.tags.length ? search.tags : undefined,
  }
}

export function normalizeBrowseSearchUrl(search: BrowseSearch): BrowseSearchUrl {
  return toBrowseSearchUrl(validateBrowseSearch({ species: search.species, q: search.query, tags: search.tags }))
}
