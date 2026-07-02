import type { CreateInquiryRequest } from '../../contracts/api'
import type { CreateInquiryUseCase } from '../../domain/inquiries/create-inquiry'

export function postInquiry(input: {
  request: CreateInquiryRequest
  viewerId: string
  createInquiry: CreateInquiryUseCase
}) {
  return input.createInquiry.execute({
    listingId: input.request.listingId,
    message: input.request.message,
    senderUserId: input.viewerId,
  })
}
