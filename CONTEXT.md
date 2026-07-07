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
The current session actor viewing or interacting with listings before real authentication is wired.
_Avoid_: Anonymous visitor, browser session

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
A report about a missing or found animal routed to an organization based on species.
_Avoid_: Listing, inquiry

**Clinic**:
A directory entry for a veterinary or pet-care provider.
_Avoid_: Organization, rescue

**Saved listing**:
A user- or viewer-scoped bookmark of a listing for later review.
_Avoid_: Favorite pet profile, anonymous local save

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
