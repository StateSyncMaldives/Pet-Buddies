import { describe, expect, it } from 'vitest'

import { BIRD_FILTERS, CAT_FILTERS } from '../../../src/data/seed'
import type { BrowseSearch } from '../../../src/router/browse-search'
import {
  clearFilters,
  filterListings,
  hasActiveFilters,
  setQuery,
  switchSpecies,
  toggleTag,
  traitChipsFor,
} from '../../../src/router/browse-search'
import type { Listing } from '../../../src/types'

describe('switchSpecies', () => {
  it('clears tags but keeps query when species changes', () => {
    const input: BrowseSearch = { species: 'cat', query: 'siamese', tags: ['Hand-tame'] }
    const result = switchSpecies(input, 'bird')
    expect(result).toEqual({ species: 'bird', query: 'siamese', tags: [] })
  })

  it('returns the same reference when species is unchanged', () => {
    const input: BrowseSearch = { species: 'cat', query: 'siamese', tags: ['Hand-tame'] }
    expect(switchSpecies(input, 'cat')).toBe(input)
  })

  it('does not mutate the input', () => {
    const input: BrowseSearch = { species: 'cat', query: 'siamese', tags: ['Hand-tame'] }
    switchSpecies(input, 'bird')
    expect(input).toEqual({ species: 'cat', query: 'siamese', tags: ['Hand-tame'] })
  })
})

describe('setQuery', () => {
  it('updates query while preserving species and tags', () => {
    const input: BrowseSearch = { species: 'bird', query: 'old', tags: ['Hand-tame'] }
    const result = setQuery(input, 'new')
    expect(result).toEqual({ species: 'bird', query: 'new', tags: ['Hand-tame'] })
  })

  it('does not mutate the input', () => {
    const input: BrowseSearch = { species: 'bird', query: 'old', tags: ['Hand-tame'] }
    setQuery(input, 'new')
    expect(input.query).toBe('old')
  })
})

describe('toggleTag', () => {
  it('adds a label when absent', () => {
    const input: BrowseSearch = { species: 'cat', query: 'q', tags: [] }
    const result = toggleTag(input, 'Hand-tame')
    expect(result).toEqual({ species: 'cat', query: 'q', tags: ['Hand-tame'] })
  })

  it('removes a label when present', () => {
    const input: BrowseSearch = { species: 'cat', query: 'q', tags: ['Hand-tame'] }
    const result = toggleTag(input, 'Hand-tame')
    expect(result.tags).toEqual([])
  })

  it('matches case-insensitively via slug and removes the existing label form', () => {
    const input: BrowseSearch = { species: 'cat', query: 'q', tags: ['Hand-tame'] }
    const result = toggleTag(input, 'hand-tame')
    expect(result.tags).toEqual([])
  })

  it('stores the passed label form when adding', () => {
    const input: BrowseSearch = { species: 'cat', query: 'q', tags: [] }
    const result = toggleTag(input, 'Needs foster')
    expect(result.tags).toEqual(['Needs foster'])
  })

  it('preserves species and query', () => {
    const input: BrowseSearch = { species: 'bird', query: 'q', tags: [] }
    const result = toggleTag(input, 'Hand-tame')
    expect(result.species).toBe('bird')
    expect(result.query).toBe('q')
  })

  it('does not mutate the input', () => {
    const input: BrowseSearch = { species: 'cat', query: 'q', tags: ['Hand-tame'] }
    toggleTag(input, 'Kitten')
    expect(input.tags).toEqual(['Hand-tame'])
  })
})

describe('clearFilters', () => {
  it('empties query and tags but keeps species', () => {
    const input: BrowseSearch = { species: 'bird', query: 'q', tags: ['Hand-tame'] }
    const result = clearFilters(input)
    expect(result).toEqual({ species: 'bird', query: '', tags: [] })
  })

  it('does not mutate the input', () => {
    const input: BrowseSearch = { species: 'bird', query: 'q', tags: ['Hand-tame'] }
    clearFilters(input)
    expect(input).toEqual({ species: 'bird', query: 'q', tags: ['Hand-tame'] })
  })
})

describe('hasActiveFilters', () => {
  it('is false for empty query and no tags', () => {
    expect(hasActiveFilters({ species: 'cat', query: '', tags: [] })).toBe(false)
  })

  it('is false for whitespace-only query and no tags', () => {
    expect(hasActiveFilters({ species: 'cat', query: '   ', tags: [] })).toBe(false)
  })

  it('is true when query is set', () => {
    expect(hasActiveFilters({ species: 'cat', query: 'siamese', tags: [] })).toBe(true)
  })

  it('is true when tags are non-empty', () => {
    expect(hasActiveFilters({ species: 'cat', query: '', tags: ['Hand-tame'] })).toBe(true)
  })
})

describe('traitChipsFor', () => {
  it('returns the cat vocabulary for cat species', () => {
    const chips = traitChipsFor({ species: 'cat', query: '', tags: [] })
    expect(chips.map((c) => c.label)).toEqual(CAT_FILTERS)
  })

  it('returns the bird vocabulary for bird species', () => {
    const chips = traitChipsFor({ species: 'bird', query: '', tags: [] })
    expect(chips.map((c) => c.label)).toEqual(BIRD_FILTERS)
  })

  it('marks the right chips active given tags', () => {
    const chips = traitChipsFor({ species: 'cat', query: '', tags: ['Hand-tame'] })
    const active = chips.filter((c) => c.active).map((c) => c.label)
    expect(active).toEqual(['Hand-tame'])
  })

  it('marks chips active via case-insensitive slug match', () => {
    const chips = traitChipsFor({ species: 'cat', query: '', tags: ['hand-tame'] })
    const handTame = chips.find((c) => c.slug === 'hand-tame')
    expect(handTame?.active).toBe(true)
  })

  it('gives each entry a label, slug, and active flag', () => {
    const chips = traitChipsFor({ species: 'cat', query: '', tags: [] })
    for (const chip of chips) {
      expect(typeof chip.label).toBe('string')
      expect(typeof chip.slug).toBe('string')
      expect(typeof chip.active).toBe('boolean')
    }
  })
})

describe('filterListings', () => {
  const make = (over: Partial<Listing>): Listing =>
    ({ id: 'x', species: 'cat', name: 'Cat', age: '1y', sex: 'Female', area: 'Malé', tags: [], ...over }) as Listing

  const listings: Listing[] = [
    make({ id: 'mishka', name: 'Mishka', species: 'cat', area: 'Maafannu', tags: ['Vaccinated', 'Hand-tame'] }),
    make({ id: 'biscuit', name: 'Biscuit', species: 'cat', area: 'Villingili', tags: ['Kitten', 'Hand-tame'] }),
    make({ id: 'kiwi', name: 'Kiwi', species: 'bird', breed: 'Budgerigar', area: 'Maafannu', tags: ['Hand-tame'] }),
    make({ id: 'pending', name: 'Simba', species: 'cat', tags: ['Kitten'], status: 'pending' }),
    make({ id: 'adopted', name: 'Gone', species: 'cat', tags: [], status: 'adopted' }),
  ]

  it('keeps only the active species', () => {
    const cats = filterListings(listings, { species: 'cat', query: '', tags: [] })
    expect(cats.map((l) => l.id)).toEqual(['mishka', 'biscuit'])
  })

  it('excludes hidden statuses (pending, adopted, rejected)', () => {
    const cats = filterListings(listings, { species: 'cat', query: '', tags: [] })
    expect(cats.some((l) => l.id === 'pending' || l.id === 'adopted')).toBe(false)
  })

  it('requires all active tags (slug-normalized)', () => {
    const result = filterListings(listings, { species: 'cat', query: '', tags: ['kitten'] })
    expect(result.map((l) => l.id)).toEqual(['biscuit'])
  })

  it('matches the query against name, breed, area, and tags', () => {
    expect(filterListings(listings, { species: 'cat', query: 'villing', tags: [] }).map((l) => l.id)).toEqual(['biscuit'])
    expect(filterListings(listings, { species: 'bird', query: 'budgeri', tags: [] }).map((l) => l.id)).toEqual(['kiwi'])
  })

  it('returns an empty list when nothing matches', () => {
    expect(filterListings(listings, { species: 'cat', query: 'zzzzz', tags: [] })).toEqual([])
  })
})
