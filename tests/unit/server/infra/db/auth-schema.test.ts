import { describe, expect, it } from 'vitest'
import * as schema from '../../../../../src/server/infra/db/schema'

describe('auth schema', () => {
  it('exposes better-auth tables', () => {
    expect(schema.session).toBeDefined()
    expect(schema.account).toBeDefined()
    expect(schema.verification).toBeDefined()
  })
  it('users carries role + ban + emailVerified columns', () => {
    const cols = Object.keys(schema.users)
    expect(cols).toContain('role')
    expect(cols).toContain('emailVerified')
    expect(cols).toContain('banned')
    expect(cols).not.toContain('globalRole')
  })
})
