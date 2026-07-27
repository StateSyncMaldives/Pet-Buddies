import type { BirdSpecies } from '../contracts/api'
import type { ListingAggregate } from '../domain/listings/listing-mapper'
import type { OrganizationRecord, TagRecord, UserRecord } from '../../../backend/contracts'
import { SEED_LISTINGS } from '../../data/seed'

const SEEDED_AT = '2026-07-02T08:00:00.000Z'
const PHOTO_KEY_PREFIX = 'seed/'

const ORGANIZATION_PRESETS = {
  'Maldives Cat Rescue': {
    id: 'org-cat-rescue',
    slug: 'maldives-cat-rescue',
    kind: 'rescue',
    areaLabel: 'Greater Malé',
    isVerified: true,
  },
  'Feline Welfare Organization': {
    id: 'org-feline-welfare',
    slug: 'feline-welfare-organization',
    kind: 'ngo',
    areaLabel: 'Greater Malé',
    isVerified: true,
  },
  'Zoophilist Society Maldives': {
    id: 'org-bird-rescue',
    slug: 'zoophilist-society-maldives',
    kind: 'ngo',
    areaLabel: 'Greater Malé',
    isVerified: true,
  },
} as const satisfies Record<string, { id: string; slug: string; kind: OrganizationRecord['kind']; areaLabel: string; isVerified: boolean }>

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function normalizeSex(value: string): 'male' | 'female' | 'unknown' {
  const lowered = value.toLowerCase()
  if (lowered === 'male') return 'male'
  if (lowered === 'female') return 'female'
  return 'unknown'
}

/**
 * Deterministically maps the frontend seed listings into domain aggregates,
 * deriving the organization, listing-owner user, and tag records they embed.
 * Used by the durable seed (which persists them to D1). Pure — a fresh call
 * returns a fresh set with its own deduped related records.
 *
 * NOTE: the in-memory prototype backend still keeps its own copy of this
 * mapping; unifying the two is tracked as a follow-up (see ADR 0008).
 */
export function buildSeedListingAggregates(): ListingAggregate[] {
  const organizationsByName = new Map<string, OrganizationRecord>()
  const usersByName = new Map<string, UserRecord>()
  const tagsBySlug = new Map<string, TagRecord>()

  function ensureOrganization(name: string): OrganizationRecord {
    const existing = organizationsByName.get(name)
    if (existing) return existing
    const preset = ORGANIZATION_PRESETS[name as keyof typeof ORGANIZATION_PRESETS]
    const organization: OrganizationRecord = {
      id: preset?.id ?? `org-${slugify(name)}`,
      slug: preset?.slug ?? slugify(name),
      name,
      kind: preset?.kind ?? 'community',
      description: null,
      areaLabel: preset?.areaLabel ?? 'Greater Malé',
      contactEmail: null,
      contactPhone: null,
      isVerified: preset?.isVerified ?? false,
      verifiedAt: preset?.isVerified ? SEEDED_AT : null,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
    }
    organizationsByName.set(name, organization)
    return organization
  }

  function ensureUser(displayName: string): UserRecord {
    const existing = usersByName.get(displayName)
    if (existing) return existing
    const slug = slugify(displayName)
    const user: UserRecord = {
      id: `user-${slug}`,
      googleSub: `sub-${slug}`,
      email: `${slug}@example.com`,
      emailVerified: false,
      displayName,
      avatarUrl: null,
      role: 'user',
      banned: false,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
    }
    usersByName.set(displayName, user)
    return user
  }

  function ensureTag(label: string, species: 'cat' | 'bird'): TagRecord {
    const id = slugify(label)
    const existing = tagsBySlug.get(id)
    if (existing) return existing
    const tag: TagRecord = { id, slug: id, label, speciesScope: species, createdAt: SEEDED_AT }
    tagsBySlug.set(id, tag)
    return tag
  }

  return SEED_LISTINGS.map((listing) => {
    const organization = listing.org ? ensureOrganization(listing.org) : null
    const listedByUser = listing.org ? null : ensureUser(listing.lister ?? 'Community member')
    const listingId = listing.id
    const species = listing.species
    return {
      listing: {
        id: listingId,
        slug: listingId,
        species,
        birdSpecies: (listing.breed as BirdSpecies | undefined) ?? null,
        name: listing.name,
        ageText: listing.age,
        sex: normalizeSex(listing.sex),
        areaLabel: listing.area,
        story: listing.story,
        status: listing.status ?? 'live',
        listedByUserId: listedByUser?.id ?? null,
        organizationId: organization?.id ?? null,
        publishedAt: listing.status === 'pending' ? null : SEEDED_AT,
        adoptedAt: listing.status === 'adopted' ? SEEDED_AT : null,
        rejectedAt: listing.status === 'rejected' ? SEEDED_AT : null,
        rejectedReason: null,
        createdAt: SEEDED_AT,
        updatedAt: SEEDED_AT,
      },
      images: listing.photo
        ? [
            {
              id: `${listingId}-image-0`,
              listingId,
              objectKey: `${PHOTO_KEY_PREFIX}${listingId}`,
              publicUrl: listing.photo,
              sortOrder: 0,
              width: null,
              height: null,
              createdAt: SEEDED_AT,
            },
          ]
        : [],
      tags: listing.tags.map((tagLabel) => ensureTag(tagLabel, species)),
      organization,
      listedByUser,
      savedByViewer: false,
    }
  })
}
