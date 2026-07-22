import { apiResultErr, isBirdSpecies, type ApiErrorCode, type BirdSpecies, type ReportKind, type Species } from '../../server/contracts/api'

export type ReportRoutingResult =
  | { ok: true; value: { routedToOrganizationId: string } }
  | { ok: false; error: { code: ApiErrorCode; message: string } }

export function routeLostFoundReport(input: {
  species: Species
  reportKind: ReportKind
  birdSpecies?: BirdSpecies | string
}): ReportRoutingResult {
  if (input.species === 'bird' && !isBirdSpecies(input.birdSpecies)) {
    return apiResultErr('VALIDATION_ERROR', 'Bird reports require an allowlisted bird species.')
  }

  return {
    ok: true,
    value: {
      routedToOrganizationId: input.species === 'bird' ? 'org-bird-rescue' : 'org-cat-rescue',
    },
  }
}
