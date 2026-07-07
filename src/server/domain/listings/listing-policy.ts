import { isBirdSpecies, type ApiErrorCode, type BirdSpecies, type ListingStatus, type Species } from '../../contracts/api'

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

  let birdSpecies: BirdSpecies | undefined
  if (input.species === 'bird') {
    if (!isBirdSpecies(input.birdSpecies)) {
      return BIRD_SPECIES_ERROR
    }
    birdSpecies = input.birdSpecies
  }

  return {
    ok: true,
    value: {
      status: 'pending',
      ...(birdSpecies ? { birdSpecies } : {}),
      listedByUserId: input.listedByUserId ?? null,
      organizationId: input.organization?.id ?? null,
    },
  }
}
