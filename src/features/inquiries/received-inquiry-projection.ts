import type { ReceivedAdoptionInquirySummary } from '../../server/contracts/api'
import type { ReceivedAdoptionInquiry } from './adoption-inquiry-repository'

/**
 * Shown when the sender cannot be resolved. Unreachable in practice — the
 * sender foreign key is NOT NULL and cascades — but the projection must not
 * render a blank name if it ever is.
 */
export const UNKNOWN_SENDER_DISPLAY_NAME = 'Pet Buddies member'

/**
 * The single projection from repository record to API summary.
 *
 * Both the durable and prototype backends call this, so the two cannot drift
 * on field mapping or the unknown-sender fallback — parity is structural here
 * rather than something two test suites have to police independently.
 */
export function toReceivedAdoptionInquirySummary(
  received: ReceivedAdoptionInquiry,
): ReceivedAdoptionInquirySummary {
  return {
    id: received.id,
    listingId: received.listingId,
    listingName: received.listingNameSnapshot,
    senderDisplayName: received.senderDisplayName || UNKNOWN_SENDER_DISPLAY_NAME,
    senderEmail: received.senderEmail,
    message: received.message,
    status: received.status,
    createdAt: received.createdAt,
  }
}
