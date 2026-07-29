import { createFileRoute } from '@tanstack/react-router'
import { createRequestAuth } from '../server/auth/auth'

/**
 * Every auth response is uncacheable, by the browser and by any intermediary.
 *
 * These carry session cookies, single-use OAuth codes and one-shot state
 * redirects — none of it may be stored or replayed. Better Auth does not set
 * cache headers itself, and a cached OAuth callback is particularly nasty:
 * the browser replays a stale response instead of hitting the server, so the
 * user sees a dead page at the callback URL, no request reaches the Worker,
 * and clearing the cache is the only way out.
 */
function uncacheable(response: Response): Response {
  const headers = new Headers(response.headers)
  headers.set('cache-control', 'no-store, no-cache, must-revalidate, max-age=0')
  headers.set('pragma', 'no-cache')
  headers.set('expires', '0')
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

const handle = async ({ request }: { request: Request }) => {
  const auth = await createRequestAuth()
  return uncacheable(await auth.handler(request))
}

export const Route = createFileRoute('/api/auth/$')({
  server: { handlers: { GET: handle, POST: handle } },
})
