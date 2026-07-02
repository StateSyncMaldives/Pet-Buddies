import type { ApiErrorCode, BirdSpecies, ListingStatus, Species } from '../../contracts/api'

const ALLOWLISTED_BIRD_SPECIES = new Set<BirdSpecies>([
  'Budgerigar',
  'Cockatiel',
  'Lovebird',
  'Finch',
  'Canary',
])

export interface ListingPolicyOwner {
  id: string
  isVerified: boolean
}

export interface ListingDraftInput {
  species: Species
  birdSpecies?: BirdSpecies | string | null
  listedByUserId?: string | null
  organization?: ListingPolicyOwner | null
}

export type ListingPolicySuccess = {
  ok: true
  value: {
    status: ListingStatus
    birdSpecies?: BirdSpecies
    listedByUserId: string | null
    organizationId: string | null
  }
}

export type ListingPolicyFailure = {
  ok: false
  error: {
    code: ApiErrorCode
    message: string
  }
}

export type ListingPolicyResult = ListingPolicySuccess | ListingPolicyFailure

const OWNER_ERROR: ListingPolicyFailure = {
  ok: false,
  error: {
    code: 'VALIDATION_ERROR',
    message: 'A listing owner must be exactly one of a user or a verified organization.',
  },
}

const BIRD_SPECIES_ERROR: ListingPolicyFailure = {
  ok: false,
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Bird listings require an allowlisted bird species.',
  },
}

const CAT_BIRD_SPECIES_ERROR: ListingPolicyFailure = {
  ok: false,
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Cats cannot include bird species.',
  },
}

export function validateListingDraft(input: ListingDraftInput): ListingPolicyResult {
  const hasUserOwner = Boolean(input.listedByUserId)
  const hasVerifiedOrganization = Boolean(input.organization?.id && input.organization.isVerified)

  if (Number(hasUserOwner) + Number(hasVerifiedOrganization) !== 1) {
    return OWNER_ERROR
  }

  if (input.species === 'cat' && input.birdSpecies) {
    return CAT_BIRD_SPECIES_ERROR
  }

  if (input.species === 'bird') {
    if (!input.birdSpecies || !ALLOWLISTED_BIRD_SPECIES.has(input.birdSpecies as BirdSpecies)) {
      return BIRD_SPECIES_ERROR
    }
  }

  return {
    ok: true,
    value: {
      status: 'pending',
      ...(input.species === 'bird' && input.birdSpecies ? { birdSpecies: input.birdSpecies as BirdSpecies } : {}),
      listedByUserId: input.listedByUserId ?? null,
      organizationId: input.organization?.id ?? null,
    },
  }
}
