import type { AdoptionInquiryRecord } from '../../../../backend/contracts'

export interface AsyncAdoptionInquiryRepository {
  save(inquiry: AdoptionInquiryRecord): Promise<AdoptionInquiryRecord>
  listSentBySender(senderUserId: string): Promise<AdoptionInquiryRecord[]>
}

export function createInMemoryAsyncAdoptionInquiryRepository(input: {
  inquiries?: AdoptionInquiryRecord[]
} = {}): AsyncAdoptionInquiryRepository {
  const inquiries = new Map<string, AdoptionInquiryRecord>()

  for (const inquiry of input.inquiries ?? []) {
    inquiries.set(inquiry.id, { ...inquiry })
  }

  return {
    async save(inquiry) {
      inquiries.set(inquiry.id, { ...inquiry })
      return { ...inquiry }
    },
    async listSentBySender(senderUserId) {
      return Array.from(inquiries.values())
        .filter((inquiry) => inquiry.senderUserId === senderUserId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .map((inquiry) => ({ ...inquiry }))
    },
  }
}
