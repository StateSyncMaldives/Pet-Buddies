import type { createAuth } from '../../src/server/auth/auth'
import { BOOTSTRAP_ACCOUNTS, seedAuth } from '../../src/server/auth/seed-auth'
import type { PetBuddiesDrizzleDatabase } from '../../src/server/infra/db/d1-drizzle'

type Auth = ReturnType<typeof createAuth>

export const TEST_MEMBER_ACCOUNT = {
  email: 'member@petbuddies.mv',
  password: 'change-me-user-0000',
  name: 'Pet Buddies Member',
} as const

function firstCookiePair(response: Response, context: string): string {
  const setCookie = response.headers.get('set-cookie')
  if (!setCookie) throw new Error(`${context} returned no set-cookie header (status ${response.status})`)
  return setCookie.split(';')[0]!
}

async function post(auth: Auth, path: string, body: unknown): Promise<Response> {
  return auth.handler(
    new Request(`http://localhost${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
}

/** Signs a brand-new user up through the HTTP handler and returns its session cookie. */
export async function signUpAndGetCookie(
  auth: Auth,
  input: { email: string; password: string; name: string },
): Promise<string> {
  return firstCookiePair(await post(auth, '/api/auth/sign-up/email', input), 'sign-up')
}

/** Signs an existing user in through the HTTP handler and returns its session cookie. */
export async function signInAndGetCookie(
  auth: Auth,
  input: { email: string; password: string },
): Promise<string> {
  return firstCookiePair(await post(auth, '/api/auth/sign-in/email', input), 'sign-in')
}

/**
 * Seeds the bootstrap accounts (plus a plain member) and returns a session
 * cookie for the requested global role. The cookie is minted through the real
 * sign-in endpoint, so it exercises the same code path a browser would.
 */
export async function createTestSession(
  auth: Auth,
  database: PetBuddiesDrizzleDatabase,
  role: 'user' | 'moderator' | 'admin',
): Promise<string> {
  await seedAuth({ auth, database })

  if (role === 'user') {
    return signUpAndGetCookie(auth, TEST_MEMBER_ACCOUNT).catch(() =>
      signInAndGetCookie(auth, TEST_MEMBER_ACCOUNT),
    )
  }

  const spec = role === 'admin' ? BOOTSTRAP_ACCOUNTS.admin : BOOTSTRAP_ACCOUNTS.moderator
  return signInAndGetCookie(auth, { email: spec.email, password: spec.password })
}
