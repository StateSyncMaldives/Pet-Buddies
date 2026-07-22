# Pet Buddies domain glossary

**Listing**:
An adoption post for a specific pet that can be reviewed, published, saved, inquired about, and eventually marked adopted.
_Avoid_: Post, ad, card

**Listing owner**:
The accountable publisher of a listing, represented by either an individual user or a verified organization.
_Avoid_: Seller, author

**Owned listings**:
Listings for which the current viewer is the listing owner in the current identity model.
_Avoid_: My posts, authored cards

**Viewer**:
The current session actor, who is either a signed-in user or anonymous. Reads may be viewer-scoped; anything that must persist against an identity requires the viewer to be a signed-in user.
_Avoid_: Browser session, display-name-as-identity

**Signed-in user**:
A viewer with an authenticated session backed by a durable user record. The only actor that can own saved listings, adoption inquiries, listings, and moderation events.
_Avoid_: Member, account, logged-in visitor

**Verified organization**:
A rescue, NGO, partner, or community group that can publish listings under its own identity and receive routed reports.
_Avoid_: Vendor, clinic

**Adoption inquiry**:
A one-way message from a user expressing interest in a listing.
_Avoid_: Chat, conversation, application thread

**Sent adoption inquiry**:
An adoption inquiry submitted by the current viewer and shown back to that viewer for reference.
_Avoid_: Inbox message, reply thread, conversation

**Lost/found report**:
A report about a missing or found animal routed to an organization based on species. Every report carries a reachable reporter: a signed-in user, or — for anonymous viewers — a required contact email.
_Avoid_: Listing, inquiry, contactless report

**Clinic**:
A directory entry for a veterinary or pet-care provider.
_Avoid_: Organization, rescue

**Saved listing**:
A user-scoped bookmark of a listing for later review. Anonymous viewers cannot save; the attempt opens the sign-in flow.
_Avoid_: Favorite pet profile, anonymous local save, viewer-scoped save

**Moderation event**:
An immutable record of a listing lifecycle action such as submission, approval, rejection, adoption, or restoration.
_Avoid_: Status history row

**Listing image**:
One of an ordered set of images attached to a listing by its listing owner, reviewed as part of the listing in the review queue.
_Avoid_: Attachment, media file, upload

**Report photo**:
The single optional photo attached to a lost/found report to help the routed organization identify the animal.
_Avoid_: Attachment, listing image, evidence

**Managed media object key**:
The namespaced storage key (`listing-images/<id>.<ext>` or `report-photos/<id>.<ext>`) under which uploaded media lives; the source of truth for media URLs, which are derived from it at read time.
_Avoid_: Public URL, file path, raw key

**Media upload kind**:
The kind of media being uploaded — `listing-image` or `report-photo` — which selects the validation policy and the managed object-key prefix.
_Avoid_: File type, media category

**Bird species allowlist**:
The restricted set of legal bird species supported by the product for listings and reports.
_Avoid_: Free-form species text

**Supported species**:
The animal categories Pet Buddies supports for listings and reports: cats and legally importable pet birds.
_Avoid_: Dogs, all pets, every animal

**Review queue**:
The moderator-facing list of listings awaiting a moderation decision.
_Avoid_: Mod panel, admin screen, pending list

**Global role**:
The platform-wide authorization level of a signed-in user — user, moderator, or administrator. Distinct from organization membership roles.
_Avoid_: Permission flag, org role, access level

**Moderator**:
A signed-in user whose global role grants review-queue decisions. Moderators do not use the admin screen.
_Avoid_: Admin, reviewer account

**Administrator**:
A signed-in user whose global role grants platform control: role assignment, bans, and organization verification, in addition to everything a moderator can do.
_Avoid_: Superuser, moderator

**Listing manager**:
An organization membership role (alongside member and org admin) permitted to publish listings under the organization's identity.
_Avoid_: Global role, org owner
