import { createFileRoute } from '@tanstack/react-router'
import { createRequestAuth } from '../server/auth/auth'

const handle = async ({ request }: { request: Request }) => {
  const auth = await createRequestAuth()
  return auth.handler(request)
}

export const Route = createFileRoute('/api/auth/$')({
  server: { handlers: { GET: handle, POST: handle } },
})
