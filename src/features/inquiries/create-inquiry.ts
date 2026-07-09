import type { AdoptionInquiryRecord } from '../../../backend/contracts'
import { apiResultErr, apiResultOk, type ApiResult, type CreateInquiryResponse } from '../../server/contracts/api'
import type { ListingRepository } from '../../server/domain/listings/listing-repository'

export interface CreateInquiryUseCase {
  execute(input: { listingId: string; message: string; senderUserId: string }): ApiResult<CreateInquiryResponse>
}

export function createCreateInquiryUseCase(input: {
  repository: ListingRepository
  now: () => string
  generateId: () => string
  saveInquiry: (inquiry: AdoptionInquiryRecord) => void
}): CreateInquiryUseCase {
  return {
    execute({ listingId, message, senderUserId }) {
      const aggregate = input.repository.getById(listingId)
      if (!aggregate) {
        return apiResultErr('NOT_FOUND', 'Listing not found.')
      }

      if (aggregate.listing.status !== 'live') {
        return apiResultErr('CONFLICT', 'Only live listings can receive adoption inquiries.')
      }

      const createdAt = input.now()
      const inquiryId = input.generateId()
      const recipientDisplayNameSnapshot = aggregate.organization?.name ?? aggregate.listedByUser?.displayName ?? 'Unknown owner'

      input.saveInquiry({
        id: inquiryId,
        listingId,
        senderUserId,
        recipientUserId: aggregate.listing.listedByUserId,
        recipientOrganizationId: aggregate.listing.organizationId,
        recipientDisplayNameSnapshot,
        listingNameSnapshot: aggregate.listing.name,
        message,
        status: 'awaiting_reply',
        createdAt,
        updatedAt: createdAt,
      })

      return apiResultOk<CreateInquiryResponse>({
        inquiry: {
          id: inquiryId,
          listingId,
          status: 'awaiting_reply',
          createdAt,
        },
      })
    },
  }
}
