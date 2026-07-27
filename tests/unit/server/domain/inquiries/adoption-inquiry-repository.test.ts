import { describe, expect, it } from 'vitest'

import type { AdoptionInquiryRecord } from '../../../../../backend/contracts'
import type { ListingAggregate } from '../../../../../src/server/domain/listings/listing-mapper'
import {
  createInMemoryAsyncAdoptionInquiryRepository,
  type AsyncAdoptionInquiryRepository,
} from '../../../../../src/features/inquiries/adoption-inquiry-repository'
import * as schema from '../../../../../src/server/infra/db/schema'
import { createDrizzleAdoptionInquiryRepository } from '../../../../../src/server/infra/repositories/drizzle-adoption-inquiry-repository'
import { createDrizzleListingRepository } from '../../../../../src/server/infra/repositories/drizzle-listing-repository'
import { useMiniflareD1 } from '../../../../helpers/miniflare-d1'

const sender = {
  id: 'user-sender',
  googleSub: 'sub-sender',
  email: 'sender@example.com',
  emailVerified: true,
  displayName: 'Sender',
  avatarUrl: null,
  role: 'user',
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
    story: 'Sweet rescue bird',
    status: 'live',
    listedByUserId: null,
    organizationId: 'org-1',
    publishedAt: '2026-07-02T08:00:00.000Z',
    adoptedAt: null,
    rejectedAt: null,
    rejectedReason: null,
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-07-02T08:00:00.000Z',
  },
  images: [],
  tags: [],
  organization: {
    id: 'org-1',
    slug: 'feather-friends',
    name: 'Feather Friends',
    kind: 'rescue',
    description: null,
    areaLabel: 'Male',
    contactEmail: null,
    contactPhone: null,
    isVerified: true,
    verifiedAt: '2026-06-01T08:00:00.000Z',
    createdAt: '2026-06-01T08:00:00.000Z',
    updatedAt: '2026-06-01T08:00:00.000Z',
  },
  listedByUser: null,
  savedByViewer: false,
}

const firstInquiry: AdoptionInquiryRecord = {
  id: 'inquiry-1',
  listingId: 'listing-1',
  senderUserId: sender.id,
  recipientUserId: null,
  recipientOrganizationId: 'org-1',
  recipientDisplayNameSnapshot: 'Feather Friends',
  listingNameSnapshot: 'Mango',
  message: 'I would love to adopt Mango.',
  status: 'awaiting_reply',
  createdAt: '2026-07-02T08:00:00.000Z',
  updatedAt: '2026-07-02T08:00:00.000Z',
}

const secondInquiry: AdoptionInquiryRecord = {
  ...firstInquiry,
  id: 'inquiry-2',
  message: 'Following up about Mango.',
  createdAt: '2026-07-03T08:00:00.000Z',
  updatedAt: '2026-07-03T08:00:00.000Z',
}

const createMiniflareD1 = useMiniflareD1('pet-buddies-adoption-inquiry-repository-test-db')

async function createMiniflareRepository() {
  const { db } = await createMiniflareD1()
  await db.insert(schema.users).values(sender).run()
  await createDrizzleListingRepository({ db }).create(listing)

  return createDrizzleAdoptionInquiryRepository({ db })
}

describe.each([
  {
    name: 'in-memory adoption inquiry adapter',
    createRepository: async () => createInMemoryAsyncAdoptionInquiryRepository(),
  },
  {
    name: 'Drizzle D1 adoption inquiry adapter',
    createRepository: createMiniflareRepository,
  },
])('async adoption inquiry repository contract: $name', ({ createRepository }) => {
  it('saves inquiries and lists sent inquiries newest-first by sender', async () => {
    const repository: AsyncAdoptionInquiryRepository = await createRepository()

    await repository.save(firstInquiry)
    await repository.save(secondInquiry)
    const sent = await repository.listSentBySender(sender.id)

    expect(sent.map((inquiry) => inquiry.id)).toEqual(['inquiry-2', 'inquiry-1'])
    expect(sent[0]).toMatchObject({
      listingId: 'listing-1',
      listingNameSnapshot: 'Mango',
      recipientDisplayNameSnapshot: 'Feather Friends',
      status: 'awaiting_reply',
    })
    expect(await repository.listSentBySender('other-user')).toEqual([])
  }, 15_000)
})
