// @vitest-environment node
//
// happy-dom (the project default, see vitest.config.ts) implements the
// browser rule that JS can't read a `Set-Cookie` response header: its
// FetchResponseHeaderUtility redirects `set-cookie` into an internal cookie
// jar instead of exposing it on `Response.headers`. This test asserts on the
// raw `set-cookie` header from a same-process `auth.handler()` call, so it
// needs real (Node) fetch semantics rather than the browser-emulating ones.
import { describe, expect, it } from 'vitest'
import { createAuth } from '../../../../src/server/auth/auth'
import { createTestDatabase } from '../../../helpers/test-database'

describe('/api/auth handler', () => {
  it('signs up an email/password user and issues a session cookie', async () => {
    const database = await createTestDatabase()
    const auth = createAuth({ database, secrets: {
      BETTER_AUTH_SECRET: 'x'.repeat(32), BETTER_AUTH_URL: 'http://localhost',
      GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 'secret',
    } })
    const res = await auth.handler(new Request('http://localhost/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com', password: 'password123', name: 'A B' }),
    }))
    expect(res.status).toBeLessThan(400)
    expect(res.headers.get('set-cookie')).toContain('better-auth')
  })
})
