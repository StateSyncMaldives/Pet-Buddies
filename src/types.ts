// Domain models — mirror the prototype's logic class (`Pet Buddies App.dc.html`).

export type Species = 'cat' | 'bird'

// Listing lifecycle: submit → pending → approve → live → (owner) adopted; reject → rejected.
export type ListingStatus = 'live' | 'pending' | 'rejected' | 'adopted'

export interface Listing {
  id: string
  species: Species
  name: string
  age: string
  sex: string
  area: string
  breed?: string // birds only (also used by the species allowlist)
  tags: string[]
  /** Partner-org name when listed by a verified org; otherwise null. */
  org: string | null
  /** Individual lister's name when not an org listing. */
  lister?: string
  verified: boolean
  /** Per-listing photo-area tint, e.g. '#FBE3EC'. Shown while the photo loads / as fallback. */
  tint: string
  /** Real photo URL; falls back to the species silhouette when absent (e.g. user-added listings). */
  photo?: string
  story: string
  /** Defaults to 'live' when omitted in seed data. */
  status?: ListingStatus
}

export interface Clinic {
  name: string
  area: string
  services: string[]
  tint: string
  note: string
}

/**
 * An inquiry someone sent about the viewer's own listing.
 *
 * A sibling of `Inquiry` rather than an optional `from` on it: `Inquiry.to` is
 * sender-framed by construction (the mapper prefixes "Listed by …"), so one
 * shape covering both directions would leave half its fields lying.
 */
export interface ReceivedInquiry {
  key: string
  listingId: string
  name: string
  /** Who sent it, e.g. "Aishath Ali". */
  from: string
  /** How to reach them — there is no in-app reply yet. */
  fromEmail: string
  message: string
  isCat: boolean
  isBird: boolean
  tint: string
  status: string
}

export interface Inquiry {
  key: string
  listingId: string
  name: string
  /** Display recipient, e.g. "Maldives Cat Rescue" or "Listed by Aishath". */
  to: string
  verified: boolean
  message: string
  isCat: boolean
  isBird: boolean
  tint: string
  status: string // e.g. "Awaiting reply"
}

export interface User {
  name: string
  email: string
}

export type Tab = 'browse' | 'report' | 'vets' | 'inbox' | 'saved'
export type Overlay = 'detail' | 'add' | 'inquiry' | 'mod' | null
export type InboxView = 'sent' | 'received' | 'listings'
