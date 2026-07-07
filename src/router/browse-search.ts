import { BIRD_FILTERS, CAT_FILTERS } from '../data/seed'
import type { Listing, Species } from '../types'

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

export function switchSpecies(search: BrowseSearch, species: Species): BrowseSearch {
  if (search.species === species) return search
  return { species, query: search.query, tags: [] }
}

export function setQuery(search: BrowseSearch, query: string): BrowseSearch {
  return { ...search, query }
}

export function toggleTag(search: BrowseSearch, tag: string): BrowseSearch {
  const slug = toTagSlug(tag)
  const has = search.tags.some((t) => toTagSlug(t) === slug)
  return {
    ...search,
    tags: has ? search.tags.filter((t) => toTagSlug(t) !== slug) : [...search.tags, tag],
  }
}

export function clearFilters(search: BrowseSearch): BrowseSearch {
  return { ...search, query: '', tags: [] }
}

export function hasActiveFilters(search: BrowseSearch): boolean {
  return search.query.trim().length > 0 || search.tags.length > 0
}

export function traitChipsFor(search: BrowseSearch): { label: string; slug: string; active: boolean }[] {
  const filters = search.species === 'cat' ? CAT_FILTERS : BIRD_FILTERS
  const activeSlugs = new Set(search.tags.map(toTagSlug))
  return filters.map((label) => {
    const slug = toTagSlug(label)
    return { label, slug, active: activeSlugs.has(slug) }
  })
}

// Statuses hidden from the public browse feed (mirrors the server-side live filter).
const HIDDEN_STATUSES: Listing['status'][] = ['pending', 'rejected', 'adopted']

// Read-side counterpart to the transitions: the pure predicate that decides which
// listings a BrowseSearch matches (visible status ∧ species ∧ all tags ∧ query).
export function filterListings(listings: Listing[], search: BrowseSearch): Listing[] {
  const query = search.query.trim().toLowerCase()
  const selectedSlugs = search.tags.map(toTagSlug)
  return listings.filter((listing) => {
    if (HIDDEN_STATUSES.includes(listing.status)) return false
    if (listing.species !== search.species) return false
    const listingSlugs = new Set(listing.tags.map(toTagSlug))
    if (!selectedSlugs.every((slug) => listingSlugs.has(slug))) return false
    if (!query) return true
    const haystack = `${listing.name} ${listing.breed ?? ''} ${listing.area} ${listing.tags.join(' ')}`.toLowerCase()
    return haystack.includes(query)
  })
}
