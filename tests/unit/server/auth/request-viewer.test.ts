// @vitest-environment node
//
// Mints session cookies via `auth.handler()`; happy-dom hides `set-cookie`
// from JS. See tests/unit/server/auth/auth-route.test.ts for the full reason.
import { describe, expect, it } from 'vitest'

import { createAuth } from '../../../../src/server/auth/auth'
import { resolveRequestViewer } from '../../../../src/server/auth/request-viewer'
import { signUpAndGetCookie } from '../../../helpers/auth'
import { createTestDatabase } from '../../../helpers/test-database'

const secrets = {
  BETTER_AUTH_SECRET: 'x'.repeat(32),
  BETTER_AUTH_URL: 'http://localhost',
  GOOGLE_CLIENT_ID: 'id',
  GOOGLE_CLIENT_SECRET: 'secret',
}

describe('resolveRequestViewer', () => {
  it('is anonymous outside of a request scope', async () => {
    expect(await resolveRequestViewer()).toEqual({ kind: 'anonymous' })
  })

  it('is anonymous for a request that carries no cookie', async () => {
    expect(await resolveRequestViewer({ headers: new Headers() })).toEqual({ kind: 'anonymous' })
  })

  it('resolves the signed-in viewer from the request cookie', async () => {
    const database = await createTestDatabase()
    const auth = createAuth({ database, secrets })
    const cookie = await signUpAndGetCookie(auth, {
      email: 'request@petbuddies.mv',
      password: 'password123',
      name: 'Request Viewer',
    })

    const viewer = await resolveRequestViewer({ headers: new Headers({ cookie }), auth })

    expect(viewer).toMatchObject({ kind: 'user', email: 'request@petbuddies.mv', role: 'user' })
  })
})
