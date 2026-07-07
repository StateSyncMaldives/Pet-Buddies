import type { ModerationEventRecord } from '../../../../backend/contracts'
import {
  apiResultErr,
  apiResultOk,
  type ApiResult,
  type UpdateListingModerationRequest,
  type UpdateListingModerationResponse,
} from '../../contracts/api'
import { toListingDetail } from './listing-mapper'
import type { ListingRepository } from './listing-repository'

export interface ModerateListingInput {
  listingId: string
  actorUserId: string
  request: UpdateListingModerationRequest
}

export interface ModerateListingUseCase {
  execute(input: ModerateListingInput): ApiResult<UpdateListingModerationResponse>
}

export function createModerateListingUseCase(input: {
  repository: ListingRepository
  now: () => string
  generateEventId: () => string
  saveModerationEvent: (event: ModerationEventRecord) => void
}): ModerateListingUseCase {
  return {
    execute({ listingId, actorUserId, request }) {
      const aggregate = input.repository.getById(listingId)
      if (!aggregate) {
        return apiResultErr('NOT_FOUND', 'Listing not found.')
      }

      const transition = transitionListing({
        listing: aggregate.listing,
        action: request.action,
        now: input.now(),
        reason: request.reason,
      })

      if (transition.ok === false) {
        return apiResultErr(transition.error.code, transition.error.message)
      }

      const moderationEventId = input.generateEventId()
      const savedAggregate = input.repository.save({
        ...aggregate,
        listing: transition.value,
      })

      input.saveModerationEvent({
        id: moderationEventId,
        listingId,
        actorUserId,
        action: request.action,
        reason: request.reason ?? null,
        metadataJson: null,
        createdAt: transition.value.updatedAt,
      })

      return apiResultOk({
        listing: toListingDetail(savedAggregate),
        moderationEventId,
      })
    },
  }
}

function transitionListing(input: {
  listing: NonNullable<ReturnType<ListingRepository['getById']>>['listing']
  action: UpdateListingModerationRequest['action']
  now: string
  reason?: string
}) {
  const { listing, action, now, reason } = input

  if ((action === 'approved' || action === 'rejected') && listing.status !== 'pending') {
    return {
      ok: false as const,
      error: {
        code: 'CONFLICT' as const,
        message: 'Only pending listings can be approved or rejected.',
      },
    }
  }

  if (action === 'adopted' && listing.status !== 'live') {
    return {
      ok: false as const,
      error: {
        code: 'CONFLICT' as const,
        message: 'Only live listings can be marked as adopted.',
      },
    }
  }

  if (action === 'restored' && listing.status !== 'rejected' && listing.status !== 'adopted') {
    return {
      ok: false as const,
      error: {
        code: 'CONFLICT' as const,
        message: 'Only rejected or adopted listings can be restored.',
      },
    }
  }

  if (action === 'approved') {
    return {
      ok: true as const,
      value: {
        ...listing,
        status: 'live' as const,
        publishedAt: listing.publishedAt ?? now,
        adoptedAt: null,
        rejectedAt: null,
        rejectedReason: null,
        updatedAt: now,
      },
    }
  }

  if (action === 'rejected') {
    return {
      ok: true as const,
      value: {
        ...listing,
        status: 'rejected' as const,
        rejectedAt: now,
        rejectedReason: reason ?? null,
        adoptedAt: null,
        updatedAt: now,
      },
    }
  }

  if (action === 'adopted') {
    return {
      ok: true as const,
      value: {
        ...listing,
        status: 'adopted' as const,
        adoptedAt: now,
        updatedAt: now,
      },
    }
  }

  return {
    ok: true as const,
    value: {
      ...listing,
      status: 'live' as const,
      publishedAt: listing.publishedAt ?? now,
      adoptedAt: null,
      rejectedAt: null,
      rejectedReason: null,
      updatedAt: now,
    },
  }
}
