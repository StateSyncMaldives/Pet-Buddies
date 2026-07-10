import serverEntry from '@tanstack/react-start/server-entry'

import type { PetBuddiesCloudflareBindings } from './server/infra/cloudflare/bindings'
import { runMediaGarbageCollection } from './server/infra/media/media-gc-sweep'

/**
 * Worker entry. HTTP delegates to the TanStack Start server entry (SSR/SPA
 * unchanged — it resolves the Worker env through the Cloudflare plugin, so only
 * the request is forwarded). A scheduled (cron) handler reclaims orphaned R2
 * media blobs. See wrangler.jsonc `triggers.crons` and #11.
 */
export default {
  fetch(request: Request) {
    return serverEntry.fetch(request)
  },
  scheduled(_controller: ScheduledController, env: PetBuddiesCloudflareBindings, ctx: ExecutionContext) {
    ctx.waitUntil(runMediaGarbageCollection({ env }))
  },
} satisfies ExportedHandler<PetBuddiesCloudflareBindings>
