import { describe, expect, it } from 'vitest'

import * as listingsFunctions from '../../../../src/features/listings/listings.functions'

// Namespace import so a missing export surfaces as one focused test failure
// below instead of crashing collection of the whole file.
const { validateBrowseListingsInput } = listingsFunctions as typeof listingsFunctions & {
  validateBrowseListingsInput?: (input: unknown) => { species: 'cat' | 'bird'; query: string; tags: string[] }
}

describe('browse listings input validation', () => {
  it('is exported for direct unit testing', () => {
    expect(typeof validateBrowseListingsInput).toBe('function')
  })

  describe.runIf(typeof validateBrowseListingsInput === 'function')('validator behaviour', () => {
    const validate = validateBrowseListingsInput!

    it('falls back to safe defaults for null and non-object input', () => {
      expect(validate(null)).toEqual({ species: 'cat', query: '', tags: [] })
      expect(validate(undefined)).toEqual({ species: 'cat', query: '', tags: [] })
      expect(validate('bird')).toEqual({ species: 'cat', query: '', tags: [] })
      expect(validate(42)).toEqual({ species: 'cat', query: '', tags: [] })
    })

    it('keeps bird and defaults any other species value to cat', () => {
      expect(validate({ species: 'bird' }).species).toBe('bird')
      expect(validate({ species: 'cat' }).species).toBe('cat')
      expect(validate({ species: 'dog' }).species).toBe('cat')
      expect(validate({}).species).toBe('cat')
    })

    it('trims the query and replaces non-string queries with an empty string', () => {
      expect(validate({ query: '  mishka  ' }).query).toBe('mishka')
      expect(validate({ query: 42 }).query).toBe('')
      expect(validate({}).query).toBe('')
    })

    it('trims, drops empties and non-strings, and dedupes tags preserving first-seen order', () => {
      expect(
        validate({
          tags: [' Kitten ', 'Kitten', 'Hand-tame', 7, null, '   ', '', 'Hand-tame '],
        }).tags,
      ).toEqual(['Kitten', 'Hand-tame'])
    })

    it('replaces a non-array tags value with an empty list', () => {
      expect(validate({ tags: 'Kitten' }).tags).toEqual([])
      expect(validate({}).tags).toEqual([])
    })
  })
})
