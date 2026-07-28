import { describe, expect, it } from 'vitest'

import { authClient } from '../../../../src/features/auth/auth-client'

describe('authClient', () => {
  it('exposes the sign-in methods the UI needs', () => {
    expect(typeof authClient.signIn.email).toBe('function')
    expect(typeof authClient.signIn.social).toBe('function')
    expect(typeof authClient.signUp.email).toBe('function')
    expect(typeof authClient.signOut).toBe('function')
    expect(typeof authClient.useSession).toBe('function')
  })

  it('exposes the admin plugin surface the admin screen drives', () => {
    expect(typeof authClient.admin.setRole).toBe('function')
    expect(typeof authClient.admin.banUser).toBe('function')
    expect(typeof authClient.admin.listUsers).toBe('function')
  })
})
