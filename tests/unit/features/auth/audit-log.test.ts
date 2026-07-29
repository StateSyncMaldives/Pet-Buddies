// @vitest-environment node
//
// Mints real session cookies through `auth.handler()`; happy-dom hides
// `set-cookie` from JS. See tests/unit/server/auth/auth-route.test.ts.
import { describe, expect, it } from 'vitest'

import { listModerationEventsForAdmin } from '../../../../src/features/auth/admin.functions'
import { updateListingLifecycleForViewer } from '../../../../src/features/moderation/moderation.functions'
import { createRuntimeMutationAdapter } from '../../../../src/server/mutations/mutation-adapter'
import { runWithSession } from '../../../helpers/run-server-fn'

describe('moderation audit log', () => {
  it('rejects an anonymous caller with UNAUTHORIZED', async () => {
    await runWithSession('anonymous', async ({ viewer, database }) => {
      await expect(listModerationEventsForAdmin({ viewer, database })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      })
    })
  }, 20_000)

  it('rejects a plain user with FORBIDDEN', async () => {
    await runWithSession('user', async ({ viewer, database }) => {
      await expect(listModerationEventsForAdmin({ viewer, database })).rejects.toMatchObject({
        code: 'FORBIDDEN',
      })
    })
  }, 20_000)

  it('is readable by a moderator — it is the moderation record', async () => {
    await runWithSession('moderator', async ({ viewer, database }) => {
      await expect(listModerationEventsForAdmin({ viewer, database })).resolves.toEqual({ items: [] })
    })
  }, 20_000)

  it('records who actioned which listing, and why', async () => {
    await runWithSession('moderator', async ({ viewer, backend, database }) => {
      if (viewer.kind !== 'user') throw new Error('expected a signed-in viewer')
      const mutations = createRuntimeMutationAdapter({ backend, viewerId: viewer.id })

      await updateListingLifecycleForViewer(
        { viewer, mutations },
        {
          listingId: 'pending-simba',
          actorUserId: viewer.id,
          request: { action: 'rejected', reason: 'Photos do not show the pet' },
        },
      )

      const { items } = await listModerationEventsForAdmin({ viewer, database })

      expect(items).toHaveLength(1)
      expect(items[0]).toMatchObject({
        action: 'rejected',
        listingId: 'pending-simba',
        reason: 'Photos do not show the pet',
        actorEmail: viewer.email,
      })
      // Joined through to the listing so the log reads in product terms.
      expect(items[0]!.listingName).toBeTruthy()
      expect(items[0]!.createdAt).toBeTruthy()
    })
  }, 20_000)

  it('returns newest first and honours the limit', async () => {
    await runWithSession('moderator', async ({ viewer, backend, database }) => {
      if (viewer.kind !== 'user') throw new Error('expected a signed-in viewer')
      const mutations = createRuntimeMutationAdapter({ backend, viewerId: viewer.id })

      await updateListingLifecycleForViewer(
        { viewer, mutations },
        { listingId: 'pending-simba', actorUserId: viewer.id, request: { action: 'approved' } },
      )
      await updateListingLifecycleForViewer(
        { viewer, mutations },
        { listingId: 'pending-simba', actorUserId: viewer.id, request: { action: 'adopted' } },
      )

      const all = await listModerationEventsForAdmin({ viewer, database })
      expect(all.items.length).toBeGreaterThanOrEqual(2)

      const capped = await listModerationEventsForAdmin({ viewer, database }, { limit: 1 })
      expect(capped.items).toHaveLength(1)
    })
  }, 20_000)
})
