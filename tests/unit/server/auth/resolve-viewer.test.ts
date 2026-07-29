// @vitest-environment node
//
// Mints session cookies via `auth.handler()`; happy-dom hides `set-cookie`
// from JS. See tests/unit/server/auth/auth-route.test.ts for the full reason.
import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'

import { createAuth } from '../../../../src/server/auth/auth'
import { canWrite, isSignedIn, resolveViewer } from '../../../../src/server/auth/resolve-viewer'
import * as schema from '../../../../src/server/infra/db/schema'
import { signUpAndGetCookie } from '../../../helpers/auth'
import { createTestDatabase } from '../../../helpers/test-database'

const secrets = {
  BETTER_AUTH_SECRET: 'x'.repeat(32),
  BETTER_AUTH_URL: 'http://localhost',
  GOOGLE_CLIENT_ID: 'id',
  GOOGLE_CLIENT_SECRET: 'secret',
}

async function buildAuth() {
  const database = await createTestDatabase()
  return { database, auth: createAuth({ database, secrets }) }
}

describe('resolveViewer', () => {
  it('returns an anonymous viewer when the request carries no cookie', async () => {
    const { auth } = await buildAuth()

    const viewer = await resolveViewer({ auth, headers: new Headers() })

    expect(viewer).toEqual({ kind: 'anonymous' })
    expect(isSignedIn(viewer)).toBe(false)
    expect(canWrite(viewer)).toBe(false)
  })

  it('returns the signed-in user for a valid session', async () => {
    const { auth } = await buildAuth()
    const cookie = await signUpAndGetCookie(auth, {
      email: 'a@b.com',
      password: 'password123',
      name: 'A B',
    })

    const viewer = await resolveViewer({ auth, headers: new Headers({ cookie }) })

    expect(viewer).toMatchObject({
      kind: 'user',
      email: 'a@b.com',
      displayName: 'A B',
      role: 'user',
      banned: false,
    })
    expect(canWrite(viewer)).toBe(true)
    expect(isSignedIn(viewer)).toBe(true)
  })

  it('reflects an elevated global role', async () => {
    const { database, auth } = await buildAuth()
    const cookie = await signUpAndGetCookie(auth, {
      email: 'mod@b.com',
      password: 'password123',
      name: 'Mod',
    })
    await database.update(schema.users).set({ role: 'moderator' }).run()

    const viewer = await resolveViewer({ auth, headers: new Headers({ cookie }) })

    expect(viewer).toMatchObject({ kind: 'user', role: 'moderator' })
  })

  it('treats a banned user as signed in but unable to write', async () => {
    const { database, auth } = await buildAuth()
    const cookie = await signUpAndGetCookie(auth, {
      email: 'c@d.com',
      password: 'password123',
      name: 'C D',
    })
    await database.update(schema.users).set({ banned: true }).where(eq(schema.users.email, 'c@d.com')).run()

    const viewer = await resolveViewer({ auth, headers: new Headers({ cookie }) })

    expect(viewer).toMatchObject({ kind: 'user', banned: true })
    expect(canWrite(viewer)).toBe(false)
  })

  it('returns an anonymous viewer for a bogus cookie', async () => {
    const { auth } = await buildAuth()

    const viewer = await resolveViewer({
      auth,
      headers: new Headers({ cookie: 'better-auth.session_token=not-a-real-token' }),
    })

    expect(viewer).toEqual({ kind: 'anonymous' })
  })
})
