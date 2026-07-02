import type { ClinicSummary, ListingDetail } from '../server/contracts/api'
import type { Clinic, Inquiry, Listing } from '../types'

const CAT_TINTS = ['#FBE3EC', '#E7F0FA', '#FDF0DB', '#EFEAF7']
const BIRD_TINTS = ['#E3F3EC', '#FDF0DB', '#E7F0FA']
const CLINIC_TINTS = ['#8FC7E8', '#E78FB4', '#F6C453']

export function mapListingDetailToListing(detail: ListingDetail): Listing {
  return {
    id: detail.id,
    species: detail.species,
    name: detail.name,
    age: detail.ageText,
    sex: toTitleCase(detail.sex),
    area: detail.areaLabel,
    breed: detail.birdSpecies ?? undefined,
    tags: [...detail.tags],
    org: detail.organization?.name ?? null,
    lister: detail.listedBy.kind === 'user' ? detail.listedBy.displayName : undefined,
    verified: detail.organization?.isVerified ?? false,
    tint: pickTint(detail.species, detail.id),
    photo: detail.primaryImageUrl ?? detail.images[0]?.url ?? undefined,
    story: detail.story,
    status: detail.status,
  }
}

export function mapClinicSummaryToClinic(clinic: ClinicSummary, index: number): Clinic {
  return {
    name: clinic.name,
    area: clinic.areaLabel,
    services: [...clinic.services],
    tint: CLINIC_TINTS[index % CLINIC_TINTS.length],
    note: clinic.note ?? '',
  }
}

export function createInquiryViewModel(input: {
  key: string
  listing: Listing
  message: string
  recipient: string
  verified: boolean
}): Inquiry {
  return {
    key: input.key,
    listingId: input.listing.id,
    name: input.listing.name,
    to: input.listing.org ? input.recipient : `Listed by ${input.recipient}`,
    verified: input.verified,
    message: input.message,
    isCat: input.listing.species === 'cat',
    isBird: input.listing.species === 'bird',
    tint: input.listing.tint,
    status: 'Awaiting reply',
  }
}

function pickTint(species: Listing['species'], seed: string): string {
  const palette = species === 'cat' ? CAT_TINTS : BIRD_TINTS
  let total = 0
  for (const char of seed) total += char.charCodeAt(0)
  return palette[total % palette.length]
}

function toTitleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
