import type { AdoptionInquiryRecord, UserRecord } from '../../../backend/contracts'

/**
 * An inquiry as its recipient sees it.
 *
 * `AdoptionInquiryRecord` snapshots the *recipient's* display name but not the
 * sender's, so the sender is resolved from their current user row at read
 * time. That means the owner sees who to contact now, at the cost of a rename
 * changing how older inquiries read — a deliberate trade (see ADR 0008 on
 * snapshots, and the plan for this feature).
 */
export interface ReceivedAdoptionInquiry extends AdoptionInquiryRecord {
  senderDisplayName: string
  senderEmail: string
}

export interface AsyncAdoptionInquiryRepository {
  save(inquiry: AdoptionInquiryRecord): Promise<AdoptionInquiryRecord>
  listSentBySender(senderUserId: string): Promise<AdoptionInquiryRecord[]>
  /** Inquiries addressed to this user, newest first. */
  listReceivedByRecipient(recipientUserId: string): Promise<ReceivedAdoptionInquiry[]>
}

export function createInMemoryAsyncAdoptionInquiryRepository(
  input: {
    inquiries?: AdoptionInquiryRecord[]
    /** Sender identities, so received inquiries can name who sent them. */
    users?: readonly UserRecord[]
  } = {},
): AsyncAdoptionInquiryRepository {
  const inquiries = new Map<string, AdoptionInquiryRecord>()
  const usersById = new Map((input.users ?? []).map((user) => [user.id, user]))

  for (const inquiry of input.inquiries ?? []) {
    inquiries.set(inquiry.id, { ...inquiry })
  }

  const newestFirst = (left: AdoptionInquiryRecord, right: AdoptionInquiryRecord) =>
    right.createdAt.localeCompare(left.createdAt)

  return {
    async save(inquiry) {
      inquiries.set(inquiry.id, { ...inquiry })
      return { ...inquiry }
    },
    async listSentBySender(senderUserId) {
      return Array.from(inquiries.values())
        .filter((inquiry) => inquiry.senderUserId === senderUserId)
        .sort(newestFirst)
        .map((inquiry) => ({ ...inquiry }))
    },
    async listReceivedByRecipient(recipientUserId) {
      return Array.from(inquiries.values())
        .filter((inquiry) => inquiry.recipientUserId === recipientUserId)
        .sort(newestFirst)
        .map((inquiry) => {
          const sender = usersById.get(inquiry.senderUserId)
          return {
            ...inquiry,
            // Falls back to the id so a missing fixture is visible rather than
            // rendering as an empty name.
            senderDisplayName: sender?.displayName ?? inquiry.senderUserId,
            senderEmail: sender?.email ?? '',
          }
        })
    },
  }
}
