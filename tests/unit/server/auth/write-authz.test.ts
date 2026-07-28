// @vitest-environment node
//
// Mints real session cookies through `auth.handler()`; happy-dom hides
// `set-cookie` from JS. See tests/unit/server/auth/auth-route.test.ts.
import { describe, expect, it } from 'vitest'

import { createInquiryForViewer } from '../../../../src/features/inquiries/inquiries.functions'
import { createListingForViewer } from '../../../../src/features/listings/listings.functions'
import { toggleSavedListingForViewer } from '../../../../src/features/saved/saved.functions'
import { listSavedListingsForViewer } from '../../../../src/features/saved/saved.functions'
import type { Viewer } from '../../../../src/server/auth/resolve-viewer'
import * as schema from '../../../../src/server/infra/db/schema'
import type { CreateListingMutationInput } from '../../../../src/server/mutations/mutation-schemas'
import { createRuntimeMutationAdapter } from '../../../../src/server/mutations/mutation-adapter'
import type { AsyncAppBackend } from '../../../../src/server/runtime/app-backend'
import { runWithSession, type ServerFnHarness } from '../../../helpers/run-server-fn'

function adapterFor(viewer: Viewer, backend: AsyncAppBackend) {
  return createRuntimeMutationAdapter({
    backend,
    viewerId: viewer.kind === 'user' ? viewer.id : undefined,
  })
}

const listingRequest: CreateListingMutationInput['request'] = {
  species: 'cat',
  name: 'Nala',
  ageText: '2 years',
  sex: 'female',
  areaLabel: 'Maafannu, Malé',
  story: 'Gentle indoor cat.',
  tagIds: [],
  imageObjectKeys: [],
}

async function joinOrganization(
  { database, viewer }: ServerFnHarness,
  role: 'member' | 'listing_manager' | 'admin',
) {
  if (viewer.kind !== 'user') throw new Error('expected a signed-in viewer')
  await database
    .insert(schema.organizations)
    .values({ id: 'org-1', slug: 'org-1', name: 'Org One' })
    .onConflictDoNothing()
    .run()
  await database
    .insert(schema.organizationMembers)
    .values({ organizationId: 'org-1', userId: viewer.id, role })
    .run()
}

describe('saved-listing writes', () => {
  it('reject an anonymous viewer with UNAUTHORIZED', async () => {
    await runWithSession('anonymous', async ({ viewer, backend }) => {
      await expect(
        toggleSavedListingForViewer(
          { viewer, mutations: adapterFor(viewer, backend) },
          { listingId: 'mishka' },
        ),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })
  }, 20_000)

  it('reject a banned viewer with FORBIDDEN', async () => {
    await runWithSession('user', async ({ viewer, backend }) => {
      const bannedViewer: Viewer = { ...(viewer as Extract<Viewer, { kind: 'user' }>), banned: true }

      await expect(
        toggleSavedListingForViewer(
          { viewer: bannedViewer, mutations: adapterFor(bannedViewer, backend) },
          { listingId: 'mishka' },
        ),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' })
    })
  }, 20_000)

  it('succeed for a signed-in viewer and land on that viewer', async () => {
    await runWithSession('user', async ({ viewer, backend }) => {
      const result = await toggleSavedListingForViewer(
        { viewer, mutations: adapterFor(viewer, backend) },
        { listingId: 'mishka' },
      )

      expect(result.ok).toBe(true)
      const saved = await listSavedListingsForViewer({ viewer, backend })
      expect(saved.items.map((item) => item.id)).toEqual(['mishka'])
    })
  }, 20_000)
})

describe('adoption-inquiry writes', () => {
  it('reject an anonymous viewer with UNAUTHORIZED', async () => {
    await runWithSession('anonymous', async ({ viewer, backend }) => {
      await expect(
        createInquiryForViewer(
          { viewer, mutations: adapterFor(viewer, backend) },
          { request: { listingId: 'mishka', message: 'Can I meet Mishka?' } },
        ),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })
  }, 20_000)

  it('succeed for a signed-in viewer', async () => {
    await runWithSession('user', async ({ viewer, backend }) => {
      const result = await createInquiryForViewer(
        { viewer, mutations: adapterFor(viewer, backend) },
        { request: { listingId: 'mishka', message: 'Can I meet Mishka?' } },
      )

      expect(result.ok).toBe(true)
    })
  }, 20_000)
})

describe('listing creation', () => {
  it('rejects an anonymous viewer with UNAUTHORIZED', async () => {
    await runWithSession('anonymous', async ({ viewer, backend, database }) => {
      await expect(
        createListingForViewer(
          { viewer, database, mutations: adapterFor(viewer, backend) },
          { actorUserId: null, request: { ...listingRequest } },
        ),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })
  }, 20_000)

  it('succeeds for a signed-in viewer listing on their own behalf', async () => {
    await runWithSession('user', async ({ viewer, backend, database }) => {
      if (viewer.kind !== 'user') throw new Error('expected a signed-in viewer')

      const result = await createListingForViewer(
        { viewer, database, mutations: adapterFor(viewer, backend) },
        { actorUserId: viewer.id, request: { ...listingRequest } },
      )

      expect(result.ok).toBe(true)
    })
  }, 20_000)

  it('rejects an organization listing when the viewer is not a member', async () => {
    await runWithSession('user', async (harness) => {
      const { viewer, backend, database } = harness
      await database
        .insert(schema.organizations)
        .values({ id: 'org-1', slug: 'org-1', name: 'Org One' })
        .run()

      await expect(
        createListingForViewer(
          { viewer, database, mutations: adapterFor(viewer, backend) },
          {
            actorUserId: viewer.kind === 'user' ? viewer.id : null,
            request: { ...listingRequest, organizationId: 'org-1' },
          },
        ),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' })
    })
  }, 20_000)

  it('rejects an organization listing from a plain member', async () => {
    await runWithSession('user', async (harness) => {
      await joinOrganization(harness, 'member')
      const { viewer, backend, database } = harness

      await expect(
        createListingForViewer(
          { viewer, database, mutations: adapterFor(viewer, backend) },
          {
            actorUserId: viewer.kind === 'user' ? viewer.id : null,
            request: { ...listingRequest, organizationId: 'org-1' },
          },
        ),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' })
    })
  }, 20_000)

  it('allows an organization listing from a listing manager', async () => {
    await runWithSession('user', async (harness) => {
      await joinOrganization(harness, 'listing_manager')
      const { viewer, backend, database } = harness

      const result = await createListingForViewer(
        { viewer, database, mutations: adapterFor(viewer, backend) },
        {
          actorUserId: viewer.kind === 'user' ? viewer.id : null,
          request: { ...listingRequest, organizationId: 'org-1' },
        },
      )

      expect(result.ok).toBe(true)
    })
  }, 20_000)
})
