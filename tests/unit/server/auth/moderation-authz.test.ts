// @vitest-environment node
//
// Mints real session cookies through `auth.handler()`; happy-dom hides
// `set-cookie` from JS. See tests/unit/server/auth/auth-route.test.ts.
import { describe, expect, it } from 'vitest'

import {
  listReviewQueueForViewer,
  updateListingLifecycleForViewer,
} from '../../../../src/features/moderation/moderation.functions'
import { createRuntimeMutationAdapter } from '../../../../src/server/mutations/mutation-adapter'
import { runWithSession } from '../../../helpers/run-server-fn'

describe('review queue authorization', () => {
  it('rejects an anonymous viewer with UNAUTHORIZED', async () => {
    await runWithSession('anonymous', async ({ viewer, backend }) => {
      await expect(listReviewQueueForViewer({ viewer, backend })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      })
    })
  }, 20_000)

  it('rejects a plain user with FORBIDDEN', async () => {
    await runWithSession('user', async ({ viewer, backend }) => {
      await expect(listReviewQueueForViewer({ viewer, backend })).rejects.toMatchObject({
        code: 'FORBIDDEN',
      })
    })
  }, 20_000)

  it('allows a moderator and returns only pending listings', async () => {
    await runWithSession('moderator', async ({ viewer, backend }) => {
      const queue = await listReviewQueueForViewer({ viewer, backend })

      expect(queue.items.map((item) => item.id)).toContain('pending-simba')
      expect(queue.items.every((item) => item.status === 'pending')).toBe(true)
    })
  }, 20_000)

  it('allows an administrator', async () => {
    await runWithSession('admin', async ({ viewer, backend }) => {
      await expect(listReviewQueueForViewer({ viewer, backend })).resolves.toBeDefined()
    })
  }, 20_000)
})

describe('lifecycle transition authorization', () => {
  const input = { listingId: 'pending-simba', request: { action: 'approved' } } as const

  it('rejects a plain user with FORBIDDEN', async () => {
    await runWithSession('user', async ({ viewer, backend }) => {
      const mutations = createRuntimeMutationAdapter({ backend, viewerId: 'irrelevant' })

      await expect(
        updateListingLifecycleForViewer({ viewer, mutations }, { ...input, actorUserId: 'spoofed' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' })
    })
  }, 20_000)

  it('lets a moderator approve a pending listing', async () => {
    await runWithSession('moderator', async ({ viewer, backend }) => {
      if (viewer.kind !== 'user') throw new Error('expected a signed-in viewer')
      const mutations = createRuntimeMutationAdapter({ backend, viewerId: viewer.id })

      const result = await updateListingLifecycleForViewer(
        { viewer, mutations },
        { ...input, actorUserId: viewer.id },
      )

      expect(result.ok).toBe(true)
      const queue = await listReviewQueueForViewer({ viewer, backend })
      expect(queue.items.map((item) => item.id)).not.toContain('pending-simba')
    })
  }, 20_000)

  it('attributes the transition to the session viewer, not a client-supplied actor', async () => {
    await runWithSession('moderator', async ({ viewer, backend }) => {
      if (viewer.kind !== 'user') throw new Error('expected a signed-in viewer')
      const seen: string[] = []
      const mutations = createRuntimeMutationAdapter({ backend, viewerId: viewer.id })
      const spying = {
        ...mutations,
        updateListingLifecycle: (moderation: { actorUserId: string }) => {
          seen.push(moderation.actorUserId)
          return mutations.updateListingLifecycle(moderation as never)
        },
      }

      await updateListingLifecycleForViewer(
        { viewer, mutations: spying as never },
        { ...input, actorUserId: 'user-someone-else' },
      )

      expect(seen).toEqual([viewer.id])
    })
  }, 20_000)
})
