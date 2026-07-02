import type {
  ApiResult,
  CreateListingRequest,
  CreateListingResponse,
  OrganizationSummary,
} from '../../contracts/api'
import type { ListingImageRecord, TagRecord } from '../../../../backend/contracts'
import { toListingDetail, type ListingAggregate } from './listing-mapper'
import type { ListingRepository } from './listing-repository'
import { validateListingDraft } from './listing-policy'

export interface CreateListingDependencies {
  repository: ListingRepository
  now: () => string
  generateId: () => string
  generateSlug: (name: string) => string
  toPublicImageUrl: (objectKey: string) => string
}

export interface CreateListingInput {
  request: CreateListingRequest
  actorUserId: string | null
  organization: OrganizationSummary | null
  tags: TagRecord[]
}

export interface CreateListingUseCase {
  execute(input: CreateListingInput): ApiResult<CreateListingResponse>
}

export function createCreateListingUseCase(dependencies: CreateListingDependencies): CreateListingUseCase {
  return {
    execute(input) {
      const policyResult = validateListingDraft({
        species: input.request.species,
        birdSpecies: input.request.birdSpecies,
        listedByUserId: input.actorUserId,
        organization: input.organization
          ? {
              id: input.organization.id,
              isVerified: input.organization.isVerified,
            }
          : null,
      })

      if (policyResult.ok === false) {
        return {
          ok: false,
          error: policyResult.error,
        }
      }

      const now = dependencies.now()
      const listingId = dependencies.generateId()
      const slug = dependencies.generateSlug(input.request.name)
      const listing: ListingAggregate = {
        listing: {
          id: listingId,
          slug,
          species: input.request.species,
          birdSpecies: policyResult.value.birdSpecies ?? null,
          name: input.request.name,
          ageText: input.request.ageText,
          sex: input.request.sex ?? 'unknown',
          areaLabel: input.request.areaLabel,
          story: input.request.story,
          status: policyResult.value.status,
          listedByUserId: policyResult.value.listedByUserId,
          organizationId: policyResult.value.organizationId,
          publishedAt: null,
          adoptedAt: null,
          rejectedAt: null,
          rejectedReason: null,
          createdAt: now,
          updatedAt: now,
        },
        images: input.request.imageObjectKeys.map<ListingImageRecord>((objectKey, index) => ({
          id: `${listingId}-image-${index}`,
          listingId,
          objectKey,
          publicUrl: dependencies.toPublicImageUrl(objectKey),
          sortOrder: index,
          width: null,
          height: null,
          createdAt: now,
        })),
        tags: input.tags,
        organization: input.organization
          ? {
              id: input.organization.id,
              slug: input.organization.slug,
              name: input.organization.name,
              kind: input.organization.kind,
              description: null,
              areaLabel: input.organization.areaLabel,
              contactEmail: null,
              contactPhone: null,
              isVerified: input.organization.isVerified,
              verifiedAt: now,
              createdAt: now,
              updatedAt: now,
            }
          : null,
        listedByUser: input.actorUserId
          ? {
              id: input.actorUserId,
              googleSub: `sub-${input.actorUserId}`,
              email: `${input.actorUserId}@example.com`,
              displayName: input.actorUserId,
              avatarUrl: null,
              globalRole: 'user',
              createdAt: now,
              updatedAt: now,
            }
          : null,
        savedByViewer: false,
      }

      const created = dependencies.repository.create(listing)

      return {
        ok: true,
        data: {
          listing: toListingDetail(created),
        },
      }
    },
  }
}
