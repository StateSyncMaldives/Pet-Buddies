import type { ApiErrorCode, BirdSpecies, ReportKind, Species } from '../../contracts/api'

const ALLOWLISTED_BIRD_SPECIES = new Set<BirdSpecies>([
  'Budgerigar',
  'Cockatiel',
  'Lovebird',
  'Finch',
  'Canary',
])

export type ReportRoutingResult =
  | { ok: true; value: { routedToOrganizationId: string } }
  | { ok: false; error: { code: ApiErrorCode; message: string } }

export function routeLostFoundReport(input: {
  species: Species
  reportKind: ReportKind
  birdSpecies?: BirdSpecies | string
}): ReportRoutingResult {
  if (input.species === 'bird') {
    if (!input.birdSpecies || !ALLOWLISTED_BIRD_SPECIES.has(input.birdSpecies as BirdSpecies)) {
      return {
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Bird reports require an allowlisted bird species.',
        },
      }
    }

    return {
      ok: true,
      value: {
        routedToOrganizationId: 'org-bird-rescue',
      },
    }
  }

  return {
    ok: true,
    value: {
      routedToOrganizationId: 'org-cat-rescue',
    },
  }
}
