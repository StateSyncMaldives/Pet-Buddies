// @vitest-environment node
//
// Mints real session cookies through `auth.handler()`; happy-dom hides
// `set-cookie` from JS. See tests/unit/server/auth/auth-route.test.ts.
import { describe, expect, it } from 'vitest'

import { hydrateAppShellForViewer } from '../../../../src/features/app-shell/app-shell.functions'
import { getYouReadModelForViewer } from '../../../../src/features/profile/profile.functions'
import { listSavedListingsForViewer } from '../../../../src/features/saved/saved.functions'
import { createDurableServerMutationAdapter } from '../../../../src/server/mutations/durable-mutation-adapter'
import { runAnonymous, runWithSession } from '../../../helpers/run-server-fn'

/**
 * The demo seam is gone. With no session cookie every viewer-scoped read comes
 * back empty and every write refuses, instead of silently resolving a shared
 * demo identity; with a real cookie the same handlers see that user.
 */
describe('server functions without a session', () => {
  it('returns no saved listings for an anonymous viewer', async () => {
    await runAnonymous(async ({ viewer, backend }) => {
      expect(viewer.kind).toBe('anonymous')
      await expect(listSavedListingsForViewer({ viewer, backend })).resolves.toEqual({ items: [] })
    })
  }, 20_000)

  it('returns an empty You read model for an anonymous viewer', async () => {
    await runAnonymous(async ({ viewer, backend }) => {
      await expect(getYouReadModelForViewer({ viewer, backend })).resolves.toEqual({
        sentAdoptionInquiries: [],
        ownedListings: [],
      })
    })
  }, 20_000)

  it('still serves the public app shell to an anonymous viewer', async () => {
    await runAnonymous(async ({ viewer, backend }) => {
      const shell = await hydrateAppShellForViewer({ viewer, backend })

      expect(shell.listings.length).toBeGreaterThan(0)
      expect(shell.listings.every((listing) => !listing.savedByViewer)).toBe(true)
    })
  }, 20_000)

  it('refuses to build a write adapter for an anonymous viewer', async () => {
    await runAnonymous(async ({ viewer }) => {
      await expect(createDurableServerMutationAdapter(viewer)).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      })
    })
  }, 20_000)

  it('refuses to build a write adapter for a banned viewer', async () => {
    await expect(
      createDurableServerMutationAdapter({
        kind: 'user',
        id: 'user-banned',
        email: 'banned@petbuddies.mv',
        displayName: 'Banned',
        role: 'user',
        banned: true,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
})

describe('server functions with a real session', () => {
  it('resolves the signed-in viewer from the minted cookie', async () => {
    await runWithSession('user', async ({ viewer }) => {
      expect(viewer).toMatchObject({ kind: 'user', role: 'user', banned: false })
    })
  }, 20_000)

  it('reads the saved listings owned by that viewer', async () => {
    await runWithSession('user', async ({ viewer, backend }) => {
      if (viewer.kind !== 'user') throw new Error('expected a signed-in viewer')
      await backend.toggleSavedListing({ listingId: 'mishka', viewerId: viewer.id })

      const saved = await listSavedListingsForViewer({ viewer, backend })

      expect(saved.items.map((item) => item.id)).toEqual(['mishka'])
    })
  }, 20_000)

  it('marks the app shell against the signed-in viewer', async () => {
    await runWithSession('user', async ({ viewer, backend }) => {
      if (viewer.kind !== 'user') throw new Error('expected a signed-in viewer')
      await backend.toggleSavedListing({ listingId: 'mishka', viewerId: viewer.id })

      const shell = await hydrateAppShellForViewer({ viewer, backend })

      expect(shell.listings.find((listing) => listing.id === 'mishka')?.savedByViewer).toBe(true)
    })
  }, 20_000)

  it('resolves the seeded moderator with the moderator role', async () => {
    await runWithSession('moderator', async ({ viewer }) => {
      expect(viewer).toMatchObject({ kind: 'user', role: 'moderator' })
    })
  }, 20_000)
})
