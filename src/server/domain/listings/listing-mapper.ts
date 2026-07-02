import type {
  ListingDetail,
  ListingImage,
  ListingSummary,
  OrganizationSummary,
} from '../../contracts/api'
import type {
  ListingImageRecord,
  ListingRecord,
  OrganizationRecord,
  TagRecord,
  UserRecord,
} from '../../../../backend/contracts'

export interface ListingAggregate {
  listing: ListingRecord
  images: ListingImageRecord[]
  tags: TagRecord[]
  organization: OrganizationRecord | null
  listedByUser: UserRecord | null
  savedByViewer: boolean
}

function toOrganizationSummary(organization: OrganizationRecord | null): OrganizationSummary | null {
  if (!organization) {
    return null
  }

  return {
    id: organization.id,
    slug: organization.slug,
    name: organization.name,
    kind: organization.kind,
    areaLabel: organization.areaLabel,
    isVerified: organization.isVerified,
  }
}

function sortImages(images: ListingImageRecord[]): ListingImageRecord[] {
  return [...images].sort((left, right) => left.sortOrder - right.sortOrder)
}

function toListingImages(images: ListingImageRecord[]): ListingImage[] {
  return sortImages(images).map((image) => ({
    id: image.id,
    url: image.publicUrl ?? '',
    width: image.width,
    height: image.height,
    sortOrder: image.sortOrder,
  }))
}

export function toListingSummary(aggregate: ListingAggregate): ListingSummary {
  const primaryImage = sortImages(aggregate.images)[0]

  return {
    id: aggregate.listing.id,
    slug: aggregate.listing.slug,
    species: aggregate.listing.species,
    birdSpecies: aggregate.listing.birdSpecies,
    name: aggregate.listing.name,
    ageText: aggregate.listing.ageText,
    sex: aggregate.listing.sex,
    areaLabel: aggregate.listing.areaLabel,
    status: aggregate.listing.status === 'rejected' ? 'pending' : aggregate.listing.status,
    primaryImageUrl: primaryImage?.publicUrl ?? null,
    tags: aggregate.tags.map((tag) => tag.slug),
    organization: toOrganizationSummary(aggregate.organization),
    savedByViewer: aggregate.savedByViewer,
    publishedAt: aggregate.listing.publishedAt,
  }
}

export function toListingDetail(aggregate: ListingAggregate): ListingDetail {
  const summary = toListingSummary(aggregate)

  return {
    ...summary,
    story: aggregate.listing.story,
    images: toListingImages(aggregate.images),
    listedBy: aggregate.organization
      ? {
          kind: 'organization',
          id: aggregate.organization.id,
          displayName: aggregate.organization.name,
        }
      : {
          kind: 'user',
          id: aggregate.listedByUser?.id ?? aggregate.listing.listedByUserId ?? 'unknown-user',
          displayName: aggregate.listedByUser?.displayName ?? 'Unknown user',
        },
    inquiryAllowed: aggregate.listing.status === 'live',
  }
}
