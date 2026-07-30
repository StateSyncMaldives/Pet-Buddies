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

/** The listing owner an inquiry is addressed to. */
const recipient = {
  id: 'user-recipient',
  googleSub: 'sub-recipient',
  email: 'recipient@example.com',
  emailVerified: true,
  displayName: 'Recipient Owner',
  avatarUrl: null,
  role: 'user',
  banned: false,
  createdAt: '2026-06-01T08:00:00.000Z',
  updatedAt: '2026-06-01T08:00:00.000Z',
} as const

/** User-owned, so inquiries about it are addressed to a user, not an org. */
const ownedListing: ListingAggregate = {
  ...listing,
  listing: {
    ...listing.listing,
    id: 'listing-2',
    slug: 'mishka',
    species: 'cat',
    birdSpecies: null,
    name: 'Mishka',
    listedByUserId: recipient.id,
    organizationId: null,
  },
  organization: null,
  listedByUser: recipient,
}

const receivedOlder: AdoptionInquiryRecord = {
  id: 'inquiry-received-1',
  listingId: 'listing-2',
  senderUserId: sender.id,
  recipientUserId: recipient.id,
  recipientOrganizationId: null,
  recipientDisplayNameSnapshot: 'Recipient Owner',
  listingNameSnapshot: 'Mishka',
  message: 'Is Mishka good with children?',
  status: 'awaiting_reply',
  createdAt: '2026-07-04T08:00:00.000Z',
  updatedAt: '2026-07-04T08:00:00.000Z',
}

const receivedNewer: AdoptionInquiryRecord = {
  ...receivedOlder,
  id: 'inquiry-received-2',
  message: 'Could we meet this weekend?',
  createdAt: '2026-07-05T08:00:00.000Z',
  updatedAt: '2026-07-05T08:00:00.000Z',
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
  // users.createdAt/updatedAt are Better-Auth-managed integer/timestamp
  // columns (native Date), while this fixture keeps ISO strings for parity
  // with UserRecord — convert at the insert boundary.
  for (const user of [sender, recipient]) {
    await db
      .insert(schema.users)
      .values({ ...user, createdAt: new Date(user.createdAt), updatedAt: new Date(user.updatedAt) })
      .run()
  }
  const listings = createDrizzleListingRepository({ db })
  await listings.create(listing)
  await listings.create(ownedListing)

  return createDrizzleAdoptionInquiryRepository({ db })
}

describe.each([
  {
    name: 'in-memory adoption inquiry adapter',
    createRepository: async () => createInMemoryAsyncAdoptionInquiryRepository({ users: [sender, recipient] }),
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

  /**
   * The gap behind "the listing owner never sees the inquiry": inquiries were
   * written with the correct recipient_user_id and then never read back by it.
   */
  it('lists inquiries received by a recipient, newest-first', async () => {
    const repository: AsyncAdoptionInquiryRepository = await createRepository()

    await repository.save(receivedOlder)
    await repository.save(receivedNewer)

    const received = await repository.listReceivedByRecipient(recipient.id)

    expect(received.map((inquiry) => inquiry.id)).toEqual([
      'inquiry-received-2',
      'inquiry-received-1',
    ])
    expect(received[0]).toMatchObject({
      listingId: 'listing-2',
      listingNameSnapshot: 'Mishka',
      message: 'Could we meet this weekend?',
      status: 'awaiting_reply',
    })
  }, 15_000)

  it('resolves who sent it, so the owner knows who is asking', async () => {
    const repository: AsyncAdoptionInquiryRepository = await createRepository()

    await repository.save(receivedOlder)
    const [received] = await repository.listReceivedByRecipient(recipient.id)

    // AdoptionInquiryRecord stores no sender snapshot, so this is resolved
    // from the sender's current user row.
    expect(received).toMatchObject({
      senderDisplayName: 'Sender',
      senderEmail: 'sender@example.com',
    })
  }, 15_000)

  it('never leaks an inquiry to anyone but its recipient', async () => {
    const repository: AsyncAdoptionInquiryRepository = await createRepository()

    await repository.save(receivedOlder)
    // firstInquiry is addressed to an organization, not to a user at all.
    await repository.save(firstInquiry)

    expect(await repository.listReceivedByRecipient('user-someone-else')).toEqual([])
    // The sender of an inquiry has not *received* it.
    expect(await repository.listReceivedByRecipient(sender.id)).toEqual([])
  }, 15_000)
})
