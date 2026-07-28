// @vitest-environment node
//
// Mints real session cookies through `auth.handler()`; happy-dom hides
// `set-cookie` from JS. See tests/unit/server/auth/auth-route.test.ts.
import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'

import {
  listOrganizationsForAdmin,
  setOrganizationVerificationForAdmin,
} from '../../../../src/features/auth/admin.functions'
import * as schema from '../../../../src/server/infra/db/schema'
import { runWithSession, type ServerFnHarness } from '../../../helpers/run-server-fn'

async function unverifiedOrganization(harness: ServerFnHarness) {
  await harness.database
    .insert(schema.organizations)
    .values({ id: 'org-pending', slug: 'org-pending', name: 'Pending Rescue' })
    .onConflictDoNothing()
    .run()
  return 'org-pending'
}

describe('organization verification', () => {
  it('rejects a moderator with FORBIDDEN', async () => {
    await runWithSession('moderator', async (harness) => {
      const organizationId = await unverifiedOrganization(harness)

      await expect(
        setOrganizationVerificationForAdmin(
          { viewer: harness.viewer, database: harness.database },
          { organizationId, verified: true },
        ),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' })
    })
  }, 20_000)

  it('rejects an anonymous caller with UNAUTHORIZED', async () => {
    await runWithSession('anonymous', async (harness) => {
      const organizationId = await unverifiedOrganization(harness)

      await expect(
        setOrganizationVerificationForAdmin(
          { viewer: harness.viewer, database: harness.database },
          { organizationId, verified: true },
        ),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })
  }, 20_000)

  it('lets an administrator verify an organization and stamps the time', async () => {
    await runWithSession('admin', async (harness) => {
      const organizationId = await unverifiedOrganization(harness)

      const { organization } = await setOrganizationVerificationForAdmin(
        { viewer: harness.viewer, database: harness.database },
        { organizationId, verified: true, verifiedAt: '2026-07-28T00:00:00.000Z' },
      )

      expect(organization).toMatchObject({
        id: organizationId,
        isVerified: true,
        verifiedAt: '2026-07-28T00:00:00.000Z',
      })

      const row = await harness.database
        .select()
        .from(schema.organizations)
        .where(eq(schema.organizations.id, organizationId))
        .get()
      expect(row?.isVerified).toBe(true)
    })
  }, 20_000)

  it('clears the timestamp when verification is withdrawn', async () => {
    await runWithSession('admin', async (harness) => {
      const deps = { viewer: harness.viewer, database: harness.database }
      const organizationId = await unverifiedOrganization(harness)
      await setOrganizationVerificationForAdmin(deps, { organizationId, verified: true })

      const { organization } = await setOrganizationVerificationForAdmin(deps, {
        organizationId,
        verified: false,
      })

      // A stale timestamp must not survive and imply current standing.
      expect(organization).toMatchObject({ isVerified: false, verifiedAt: null })
    })
  }, 20_000)

  it('reports CONFLICT for an organization that does not exist', async () => {
    await runWithSession('admin', async ({ viewer, database }) => {
      await expect(
        setOrganizationVerificationForAdmin(
          { viewer, database },
          { organizationId: 'org-missing', verified: true },
        ),
      ).rejects.toMatchObject({ code: 'CONFLICT' })
    })
  }, 20_000)

  it('lists organizations for an administrator only', async () => {
    await runWithSession('admin', async ({ viewer, database }) => {
      const { items } = await listOrganizationsForAdmin({ viewer, database })
      expect(items.length).toBeGreaterThan(0)
    })

    await runWithSession('moderator', async ({ viewer, database }) => {
      await expect(listOrganizationsForAdmin({ viewer, database })).rejects.toMatchObject({
        code: 'FORBIDDEN',
      })
    })
  }, 30_000)
})
