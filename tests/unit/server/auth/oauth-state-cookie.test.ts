// @vitest-environment node
//
// Reads `set-cookie` off a same-process `auth.handler()` response; happy-dom
// hides that header. See tests/unit/server/auth/auth-route.test.ts.
import { describe, expect, it } from 'vitest'

import { createAuth } from '../../../../src/server/auth/auth'
import { createTestDatabase } from '../../../helpers/test-database'

const baseSecrets = {
  BETTER_AUTH_SECRET: 'x'.repeat(32),
  GOOGLE_CLIENT_ID: 'id',
  GOOGLE_CLIENT_SECRET: 'secret',
}

async function stateCookieFor(baseUrl: string): Promise<string> {
  const database = await createTestDatabase()
  const auth = createAuth({ database, secrets: { ...baseSecrets, BETTER_AUTH_URL: baseUrl } })

  const response = await auth.handler(
    new Request(`${baseUrl}/api/auth/sign-in/social`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: baseUrl },
      body: JSON.stringify({ provider: 'google', callbackURL: '/browse' }),
    }),
  )

  const cookies = response.headers.get('set-cookie') ?? ''
  const stateCookie = cookies
    .split(/,(?=[^;]+?=)/)
    .map((part) => part.trim())
    .find((part) => part.includes('.state='))
  if (!stateCookie) throw new Error(`no state cookie issued (set-cookie: ${cookies})`)
  return stateCookie
}

/**
 * The OAuth state cookie must come back when Google redirects the browser to
 * the callback. SameSite=Lax rides only top-level navigations, and Google's
 * silent re-auth can return in a context where it is dropped — the callback
 * then fails `state_mismatch` despite a correctly written verification row.
 * This is exactly what broke Google sign-in on the deployed origin while
 * localhost kept working.
 */
describe('OAuth state cookie', () => {
  it('is SameSite=None and Secure on an https origin', async () => {
    const cookie = await stateCookieFor('https://pet-buddies.statesync.dev')

    expect(cookie).toMatch(/SameSite=None/i)
    expect(cookie).toMatch(/Secure/i)
    // The __Secure- prefix requires the Secure attribute; both must agree.
    expect(cookie).toContain('__Secure-')
  })

  it('stays SameSite=Lax over http, where a Secure cookie would never be stored', async () => {
    const cookie = await stateCookieFor('http://localhost:5173')

    expect(cookie).toMatch(/SameSite=Lax/i)
    expect(cookie).not.toMatch(/;\s*Secure/i)
  })

  it('leaves the session cookie on SameSite=Lax, keeping its CSRF defence', async () => {
    const database = await createTestDatabase()
    const baseURL = 'https://pet-buddies.statesync.dev'
    const auth = createAuth({ database, secrets: { ...baseSecrets, BETTER_AUTH_URL: baseURL } })

    const response = await auth.handler(
      new Request(`${baseURL}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: baseURL },
        body: JSON.stringify({ email: 'a@b.com', password: 'password123', name: 'A B' }),
      }),
    )

    const sessionCookie = (response.headers.get('set-cookie') ?? '')
      .split(/,(?=[^;]+?=)/)
      .map((part) => part.trim())
      .find((part) => part.includes('session_token='))

    expect(sessionCookie).toBeDefined()
    // Relaxing this one too (via defaultCookieAttributes) would be a real
    // security regression — the narrow per-cookie override exists to avoid it.
    expect(sessionCookie).toMatch(/SameSite=Lax/i)
    expect(sessionCookie).not.toMatch(/SameSite=None/i)
  })
})
