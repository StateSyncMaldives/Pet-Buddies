// tests/unit/server/auth/access-control.test.ts
import { describe, expect, it } from 'vitest'
import { hasPermission } from '../../../../src/server/auth/access-control'

describe('global access-control policy', () => {
  const cases = [
    ['user', 'listing', 'moderate', false],
    ['user', 'user', 'setRole', false],
    ['user', 'org', 'verify', false],
    ['moderator', 'listing', 'moderate', true],
    ['moderator', 'user', 'setRole', false],
    ['moderator', 'org', 'verify', false],
    ['admin', 'listing', 'moderate', true],
    ['admin', 'user', 'setRole', true],
    ['admin', 'user', 'ban', true],
    ['admin', 'org', 'verify', true],
  ] as const

  it.each(cases)('%s can %s:%s → %s', (role, resource, action, allowed) => {
    expect(hasPermission(role, resource as never, action as never)).toBe(allowed)
  })
})
