import { describe, expect, it } from 'vitest'

import type { LostFoundReportRecord } from '../../../../../backend/contracts'
import {
  createInMemoryAsyncLostFoundReportRepository,
  type AsyncLostFoundReportRepository,
} from '../../../../../src/server/domain/reports/lost-found-report-repository'
import * as schema from '../../../../../src/server/infra/db/schema'
import { createDrizzleLostFoundReportRepository } from '../../../../../src/server/infra/repositories/drizzle-lost-found-report-repository'
import { useMiniflareD1 } from '../../../../helpers/miniflare-d1'

const catRescue = {
  id: 'org-cat-rescue',
  slug: 'maldives-cat-rescue',
  name: 'Maldives Cat Rescue',
  kind: 'rescue',
  description: null,
  areaLabel: 'Male',
  contactEmail: 'cats@example.com',
  contactPhone: null,
  isVerified: true,
  verifiedAt: '2026-06-01T08:00:00.000Z',
  createdAt: '2026-06-01T08:00:00.000Z',
  updatedAt: '2026-06-01T08:00:00.000Z',
} as const

const birdRescue = {
  ...catRescue,
  id: 'org-bird-rescue',
  slug: 'zoophilist-society-maldives',
  name: 'Zoophilist Society Maldives',
  contactEmail: 'birds@example.com',
}

const firstReport: LostFoundReportRecord = {
  id: 'report-1',
  referenceCode: 'MV1001',
  reportKind: 'lost',
  species: 'cat',
  birdSpecies: null,
  reporterUserId: null,
  reporterName: 'Aisha',
  reporterEmail: 'aisha@example.com',
  areaLabel: 'Henveiru',
  description: 'Small cat with a blue collar.',
  photoObjectKey: null,
  routedToOrganizationId: 'org-cat-rescue',
  status: 'submitted',
  createdAt: '2026-07-01T08:00:00.000Z',
  updatedAt: '2026-07-01T08:00:00.000Z',
}

const secondReport: LostFoundReportRecord = {
  ...firstReport,
  id: 'report-2',
  referenceCode: 'MV1002',
  reportKind: 'found',
  description: 'Found near the ferry terminal.',
  photoObjectKey: 'report-photo/report-2/photo.jpg',
  status: 'reviewing',
  createdAt: '2026-07-02T08:00:00.000Z',
  updatedAt: '2026-07-02T08:00:00.000Z',
}

const birdReport: LostFoundReportRecord = {
  ...firstReport,
  id: 'report-3',
  referenceCode: 'MV1003',
  species: 'bird',
  birdSpecies: 'Cockatiel',
  routedToOrganizationId: 'org-bird-rescue',
  createdAt: '2026-07-03T08:00:00.000Z',
  updatedAt: '2026-07-03T08:00:00.000Z',
}

const createMiniflareD1 = useMiniflareD1('pet-buddies-lost-found-report-repository-test-db')

async function createMiniflareRepository() {
  const { db } = await createMiniflareD1()
  await db.insert(schema.organizations).values([catRescue, birdRescue]).run()

  return createDrizzleLostFoundReportRepository({ db })
}

describe.each([
  {
    name: 'in-memory Lost/found report adapter',
    createRepository: async () => createInMemoryAsyncLostFoundReportRepository(),
  },
  {
    name: 'Drizzle D1 Lost/found report adapter',
    createRepository: createMiniflareRepository,
  },
])('async Lost/found report repository contract: $name', ({ createRepository }) => {
  it('saves reports, resolves receipts by reference code, and lists routed history newest-first', async () => {
    const repository: AsyncLostFoundReportRepository = await createRepository()

    await repository.save(firstReport)
    await repository.save(secondReport)
    await repository.save(birdReport)

    await expect(repository.getByReferenceCode('MV1002')).resolves.toMatchObject({
      id: 'report-2',
      photoObjectKey: 'report-photo/report-2/photo.jpg',
      routedToOrganizationId: 'org-cat-rescue',
      status: 'reviewing',
    })
    await expect(repository.getByReferenceCode('missing')).resolves.toBeNull()

    const catHistory = await repository.listByRoutedOrganization({
      routedToOrganizationId: 'org-cat-rescue',
    })
    expect(catHistory.map((report) => report.id)).toEqual(['report-2', 'report-1'])

    const submittedCatHistory = await repository.listByRoutedOrganization({
      routedToOrganizationId: 'org-cat-rescue',
      status: 'submitted',
    })
    expect(submittedCatHistory.map((report) => report.id)).toEqual(['report-1'])
  }, 15_000)
})
