import { describe, expect, it } from 'vitest'

import type { ModerationEventRecord } from '../../../../../backend/contracts'
import type { ListingAggregate } from '../../../../../src/server/domain/listings/listing-mapper'
import {
  createInMemoryAsyncModerationEventRepository,
  type AsyncModerationEventRepository,
} from '../../../../../src/server/domain/listings/moderation-event-repository'
import * as schema from '../../../../../src/server/infra/db/schema'
import { createDrizzleListingRepository } from '../../../../../src/server/infra/repositories/drizzle-listing-repository'
import { createDrizzleModerationEventRepository } from '../../../../../src/server/infra/repositories/drizzle-moderation-event-repository'
import { useMiniflareD1 } from '../../../../helpers/miniflare-d1'

const moderator = {
  id: 'moderator-1',
  googleSub: 'sub-moderator-1',
  email: 'moderator@example.com',
  emailVerified: true,
  displayName: 'Moderator',
  avatarUrl: null,
  role: 'moderator',
  banned: false,
  createdAt: '2026-06-01T08:00:00.000Z',
  updatedAt: '2026-06-01T08:00:00.000Z',
} as const

const listing: ListingAggregate = {
  listing: {
    id: 'listing-1',
    slug: 'mango',
    species: 'bird',
    birdSpecies: 'Cockatiel',
    name: 'Mango',
    ageText: '2 years',
    sex: 'female',
    areaLabel: 'Male',
    story: 'Gentle bird ready for adoption.',
    status: 'pending',
    listedByUserId: null,
    organizationId: 'org-1',
    publishedAt: null,
    adoptedAt: null,
    rejectedAt: null,
    rejectedReason: null,
    createdAt: '2026-07-01T09:00:00.000Z',
    updatedAt: '2026-07-01T09:00:00.000Z',
  },
  images: [],
  tags: [],
  organization: {
    id: 'org-1',
    slug: 'feather-friends',
    name: 'Feather Friends',
    kind: 'rescue',
    description: 'Bird rescue',
    areaLabel: 'Male',
    contactEmail: 'hello@feather.example',
    contactPhone: '+9607000000',
    isVerified: true,
    verifiedAt: '2026-06-30T09:00:00.000Z',
    createdAt: '2026-06-30T09:00:00.000Z',
    updatedAt: '2026-06-30T09:00:00.000Z',
  },
  listedByUser: null,
  savedByViewer: false,
}

const approvedEvent: ModerationEventRecord = {
  id: 'event-1',
  listingId: 'listing-1',
  actorUserId: moderator.id,
  action: 'approved',
  reason: null,
  metadataJson: '{"source":"review-queue"}',
  createdAt: '2026-07-02T12:00:00.000Z',
}

const rejectedEvent: ModerationEventRecord = {
  id: 'event-2',
  listingId: 'listing-1',
  actorUserId: moderator.id,
  action: 'rejected',
  reason: 'Duplicate listing',
  metadataJson: null,
  createdAt: '2026-07-03T12:00:00.000Z',
}

const createMiniflareD1 = useMiniflareD1('pet-buddies-moderation-event-repository-test-db')

async function createMiniflareRepository() {
  const { db } = await createMiniflareD1()
  // users.createdAt/updatedAt are Better-Auth-managed integer/timestamp
  // columns (native Date), while this fixture keeps ISO strings for parity
  // with UserRecord — convert at the insert boundary.
  await db
    .insert(schema.users)
    .values({ ...moderator, createdAt: new Date(moderator.createdAt), updatedAt: new Date(moderator.updatedAt) })
    .run()
  await createDrizzleListingRepository({ db }).create(listing)

  return createDrizzleModerationEventRepository({ db })
}

describe.each([
  {
    name: 'in-memory moderation event adapter',
    createRepository: async () => createInMemoryAsyncModerationEventRepository(),
  },
  {
    name: 'Drizzle D1 moderation event adapter',
    createRepository: createMiniflareRepository,
  },
])('async moderation event repository contract: $name', ({ createRepository }) => {
  it('saves events and lists listing-scoped audit trail newest-first', async () => {
    const repository: AsyncModerationEventRepository = await createRepository()

    await repository.save(approvedEvent)
    await repository.save(rejectedEvent)

    const events = await repository.listByListing('listing-1')

    expect(events.map((event) => event.id)).toEqual(['event-2', 'event-1'])
    expect(events[0]).toMatchObject({
      action: 'rejected',
      reason: 'Duplicate listing',
      metadataJson: null,
    })
    expect(events[1]).toMatchObject({
      action: 'approved',
      reason: null,
      metadataJson: '{"source":"review-queue"}',
    })
    expect(await repository.listByListing('missing-listing')).toEqual([])
  }, 15_000)
})
