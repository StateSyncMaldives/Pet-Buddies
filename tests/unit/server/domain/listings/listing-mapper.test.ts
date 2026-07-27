import { describe, expect, it } from 'vitest'

import type {
  ListingImageRecord,
  ListingRecord,
  OrganizationRecord,
  TagRecord,
  UserRecord,
} from '../../../../../backend/contracts'
import { toListingDetail, toListingSummary } from '../../../../../src/server/domain/listings/listing-mapper'

const listing: ListingRecord = {
  id: 'listing-1',
  slug: 'coco',
  species: 'bird',
  birdSpecies: 'Cockatiel',
  name: 'Coco',
  ageText: '2 years',
  sex: 'female',
  areaLabel: 'Male',
  story: 'Friendly rescue bird',
  status: 'live',
  listedByUserId: null,
  organizationId: 'org-1',
  publishedAt: '2026-07-02T08:00:00.000Z',
  adoptedAt: null,
  rejectedAt: null,
  rejectedReason: null,
  createdAt: '2026-07-01T08:00:00.000Z',
  updatedAt: '2026-07-02T08:00:00.000Z',
}

const organization: OrganizationRecord = {
  id: 'org-1',
  slug: 'feather-friends',
  name: 'Feather Friends',
  kind: 'rescue',
  description: null,
  areaLabel: 'Male',
  contactEmail: 'hello@example.com',
  contactPhone: null,
  isVerified: true,
  verifiedAt: '2026-06-01T08:00:00.000Z',
  createdAt: '2026-06-01T08:00:00.000Z',
  updatedAt: '2026-06-01T08:00:00.000Z',
}

const images: ListingImageRecord[] = [
  {
    id: 'image-2',
    listingId: 'listing-1',
    objectKey: 'private/object-key-2',
    publicUrl: 'https://example.com/coco-2.jpg',
    sortOrder: 1,
    width: 800,
    height: 600,
    createdAt: '2026-07-01T08:00:00.000Z',
  },
  {
    id: 'image-1',
    listingId: 'listing-1',
    objectKey: 'private/object-key-1',
    publicUrl: 'https://example.com/coco-1.jpg',
    sortOrder: 0,
    width: 1200,
    height: 800,
    createdAt: '2026-07-01T08:00:00.000Z',
  },
]

const tags: TagRecord[] = [
  { id: 'tag-1', slug: 'playful', label: 'Playful', speciesScope: 'both', createdAt: '2026-06-01T08:00:00.000Z' },
  { id: 'tag-2', slug: 'hand-tame', label: 'Hand tame', speciesScope: 'bird', createdAt: '2026-06-01T08:00:00.000Z' },
]

const listedByUser: UserRecord = {
  id: 'user-1',
  googleSub: 'sub-1',
  email: 'owner@example.com',
  emailVerified: true,
  displayName: 'Aishath Ali',
  avatarUrl: null,
  role: 'user',
  banned: false,
  createdAt: '2026-06-01T08:00:00.000Z',
  updatedAt: '2026-06-01T08:00:00.000Z',
}

describe('listing mapper', () => {
  it('maps records into a public ListingSummary without leaking storage fields', () => {
    const summary = toListingSummary({
      listing,
      images,
      tags,
      organization,
      listedByUser: null,
      savedByViewer: true,
    })

    expect(summary).toEqual({
      id: 'listing-1',
      slug: 'coco',
      species: 'bird',
      birdSpecies: 'Cockatiel',
      name: 'Coco',
      ageText: '2 years',
      sex: 'female',
      areaLabel: 'Male',
      status: 'live',
      primaryImageUrl: 'https://example.com/coco-1.jpg',
      tags: ['playful', 'hand-tame'],
      organization: {
        id: 'org-1',
        slug: 'feather-friends',
        name: 'Feather Friends',
        kind: 'rescue',
        areaLabel: 'Male',
        isVerified: true,
      },
      savedByViewer: true,
      publishedAt: '2026-07-02T08:00:00.000Z',
    })

    expect('objectKey' in summary).toBe(false)
    expect('createdAt' in summary).toBe(false)
  })

  it('derives urls from managed object keys at read time, ignoring stored public urls', () => {
    const managedImages: ListingImageRecord[] = [
      {
        id: 'image-managed',
        listingId: 'listing-1',
        objectKey: 'listing-images/media-1.jpg',
        publicUrl: 'https://stale-domain.example.com/media-1.jpg',
        sortOrder: 0,
        width: null,
        height: null,
        createdAt: '2026-07-06T08:00:00.000Z',
      },
    ]

    const summary = toListingSummary({
      listing,
      images: managedImages,
      tags,
      organization,
      listedByUser: null,
      savedByViewer: false,
    })
    const detail = toListingDetail({
      listing,
      images: managedImages,
      tags,
      organization,
      listedByUser: null,
      savedByViewer: false,
    })

    expect(summary.primaryImageUrl).toBe('/media/listing-images/media-1.jpg')
    expect(detail.images[0].url).toBe('/media/listing-images/media-1.jpg')
  })

  it('maps a full aggregate into ListingDetail with stable public image shapes', () => {
    const detail = toListingDetail({
      listing: { ...listing, organizationId: null, listedByUserId: 'user-1' },
      images,
      tags,
      organization: null,
      listedByUser,
      savedByViewer: false,
    })

    expect(detail.listedBy).toEqual({
      kind: 'user',
      id: 'user-1',
      displayName: 'Aishath Ali',
    })
    expect(detail.images).toEqual([
      {
        id: 'image-1',
        url: 'https://example.com/coco-1.jpg',
        width: 1200,
        height: 800,
        sortOrder: 0,
      },
      {
        id: 'image-2',
        url: 'https://example.com/coco-2.jpg',
        width: 800,
        height: 600,
        sortOrder: 1,
      },
    ])
    expect(detail.story).toBe('Friendly rescue bird')
    expect('publicUrl' in detail.images[0]).toBe(false)
    expect('listedByUserId' in detail).toBe(false)
  })
})
